//! Package icons from WinGet's COM API (Microsoft.Management.Deployment),
//! which the CLI cannot provide: `winget show` never reports an icon.
//!
//! Two things shape this program.
//!
//! It runs as its own process, which is what makes COM reachable at all: an
//! unpackaged host can only marshal the out-of-proc WinRT interfaces if the
//! runtime can resolve the metadata to build a proxy, and it looks for that
//! metadata next to the HOST EXECUTABLE. That is this binary, so it plants a
//! copy beside itself; inside Raycast's own process it would be unresolvable.
//!
//! It reports results through the filesystem rather than its return value.
//! Each package's icon is written into the cache directory under that
//! package's id as soon as it is known, so the view shows icons as they
//! arrive instead of when the whole call finishes. A package that was looked
//! at and has nothing gets an empty `.none` marker, so it is not looked up
//! again.

#[allow(
    clippy::all,
    non_snake_case,
    non_camel_case_types,
    non_upper_case_globals,
    dead_code
)]
mod bindings;

use std::borrow::Cow;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read};
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use raycast_rust_macros::raycast;
use ureq::config::Config;
use ureq::http::Uri;
use ureq::tls::{RootCerts, TlsConfig, TlsProvider};
use ureq::unversioned::resolver::{DefaultResolver, ResolvedSocketAddrs, Resolver};
use ureq::unversioned::transport::{DefaultConnector, NextTimeout};
use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
use windows_core::{Interface, GUID, HSTRING};

use bindings::Microsoft::Management::Deployment::{
    CatalogPackage, ConnectResultStatus, FindPackagesOptions, FindPackagesResultStatus, IconFileType, IconTheme,
    PackageCatalog, PackageFieldMatchOption, PackageManager, PackageMatchField, PackageMatchFilter,
};

/// Production out-of-proc CLSIDs, from winget-cli
/// src/Microsoft.Management.Deployment/Public/ComClsids.h
const CLSID_PACKAGE_MANAGER: GUID = GUID::from_u128(0xC53A4F16_787E_42A4_B304_29EFFB4BF597);
const CLSID_FIND_PACKAGES_OPTIONS: GUID = GUID::from_u128(0x572DED96_9C60_4526_8F92_EE7D91D38C1A);
const CLSID_PACKAGE_MATCH_FILTER: GUID = GUID::from_u128(0xD02C9DAF_99DC_429C_B503_4E504E4AB000);

const METADATA_NAME: &str = "Microsoft.Management.Deployment.winmd";
const METADATA: &[u8] = include_bytes!("../metadata/Microsoft.Management.Deployment.winmd");

/// Sites commonly refuse requests without one.
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// What one source may cost, redirects included: an unreachable vendor host
/// would otherwise hold a worker until the OS gives up. Short, because a slow
/// host costs its row an icon for this pass either way.
const REQUEST_TIMEOUT: Duration = Duration::from_millis(2_500);
/// Caps on what a remote source may cost: bytes read, and the surface an
/// image is allowed to decode to.
const MAX_DOWNLOAD_BYTES: u64 = 4 * 1024 * 1024;
const MAX_DECODE_BYTES: u64 = 64 * 1024 * 1024;
const MAX_ICON_PIXELS: u32 = 2_048;
const MAX_REDIRECTS: u8 = 3;

/// Write each package's icon into `cache_dir`, named after the package.
/// Callers pass whatever is on screen, so plenty of ids are not in the winget
/// catalog at all — Store apps, and anything installed outside winget. Those
/// are recorded as having no icon rather than skipped, or every view would
/// ask about them again for the rest of time.
#[raycast]
fn package_icons(ids: Vec<String>, cache_dir: String) -> Result<(), String> {
    if ids.is_empty() {
        return Ok(());
    }
    ensure_metadata()?;
    unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok() }.map_err(|error| error.message())?;

    let packages = find_packages(&connect_catalog("winget")?, &ids)?;
    for id in &ids {
        if !packages.iter().any(|(matched, _)| matched == id) {
            publish(id, None, &cache_dir);
        }
    }
    resolve_icons(&packages, &cache_dir);
    Ok(())
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/// The metadata must exist next to this executable before the first COM call
/// (see module docs). It cannot ship as a build artifact, because the compiled
/// output directory is generated, so it travels embedded instead.
fn ensure_metadata() -> Result<(), String> {
    let mut path = std::env::current_exe().map_err(|error| error.to_string())?;
    path.pop();
    path.push(METADATA_NAME);
    if path.exists() {
        return Ok(());
    }
    fs::write(&path, METADATA).map_err(|error| format!("could not place WinRT metadata: {error}"))
}

fn create<T: Interface>(clsid: &GUID) -> windows_core::Result<T> {
    unsafe { CoCreateInstance(clsid, None, CLSCTX_ALL) }
}

fn connect_catalog(source: &str) -> Result<PackageCatalog, String> {
    let manager: PackageManager = create(&CLSID_PACKAGE_MANAGER).map_err(|error| error.message())?;
    let reference = manager
        .GetPackageCatalogByName(&HSTRING::from(source))
        .map_err(|error| error.message())?;
    let connect = reference.Connect().map_err(|error| error.message())?;
    if connect.Status().map_err(|error| error.message())? != ConnectResultStatus::Ok {
        return Err(format!("could not connect to the '{source}' catalog"));
    }
    connect.PackageCatalog().map_err(|error| error.message())
}

/// Look up every id in one query, and hand the results back in the order they
/// were asked for: the catalog answers in its own order, while rows should
/// resolve from the top of the list down.
///
/// Each result is paired with the id the CALLER used. Matching is
/// case-insensitive, so the catalog's own spelling can differ, and the view
/// looks for files named after the id it asked about.
fn find_packages(catalog: &PackageCatalog, ids: &[String]) -> Result<Vec<(String, CatalogPackage)>, String> {
    let options: FindPackagesOptions = create(&CLSID_FIND_PACKAGES_OPTIONS).map_err(|error| error.message())?;
    let selectors = options.Selectors().map_err(|error| error.message())?;

    // Selectors are OR-ed, so all the ids are matched by a single FindPackages
    // — one cross-process call instead of one per package.
    for id in ids {
        let filter: PackageMatchFilter = create(&CLSID_PACKAGE_MATCH_FILTER).map_err(|error| error.message())?;
        filter.SetField(PackageMatchField::Id).map_err(|error| error.message())?;
        filter
            .SetOption(PackageFieldMatchOption::EqualsCaseInsensitive)
            .map_err(|error| error.message())?;
        filter.SetValue(&HSTRING::from(id)).map_err(|error| error.message())?;
        selectors.Append(&filter).map_err(|error| error.message())?;
    }
    options.SetResultLimit(ids.len() as u32).map_err(|error| error.message())?;

    let found = catalog.FindPackages(&options).map_err(|error| error.message())?;
    if found.Status().map_err(|error| error.message())? != FindPackagesResultStatus::Ok {
        return Err("the package query failed".to_string());
    }
    let matches = found.Matches().map_err(|error| error.message())?;

    let mut packages = Vec::new();
    for index in 0..matches.Size().map_err(|error| error.message())? {
        let Ok(package) = matches.GetAt(index).and_then(|entry| entry.CatalogPackage()) else {
            continue;
        };
        let Ok(found) = package.Id().map(|id| id.to_string()) else { continue };
        let Some(position) = ids.iter().position(|wanted| wanted.eq_ignore_ascii_case(&found)) else {
            continue;
        };
        packages.push((position, ids[position].clone(), package));
    }
    packages.sort_by_key(|(position, _, _)| *position);
    Ok(packages.into_iter().map(|(_, id, package)| (id, package)).collect())
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/// Resolve and publish each package's icon, in parallel and in order.
fn resolve_icons(packages: &[(String, CatalogPackage)], cache_dir: &str) {
    // What each site turned out to offer, so packages sharing one do not each
    // re-derive it. Concurrent first-comers can still overlap; the point of
    // this map is the packages that arrive after the answer is known.
    let sites: Mutex<HashMap<String, Outcome>> = Mutex::new(HashMap::new());

    in_parallel(packages, |(id, package)| {
        // Reading the manifest is by far the most expensive step: over a
        // second per package through winget's server, dwarfing the icon
        // download that follows it.
        let Ok(metadata) = package
            .DefaultInstallVersion()
            .and_then(|version| version.GetCatalogPackageMetadata())
        else {
            // Reading the manifest is a network call, so a failure here says
            // nothing about whether the package has an icon. Publishing "no
            // icon" would make a moment's connectivity permanent; leaving it
            // unpublished costs one more lookup later.
            return;
        };

        // The manifest's own icons first — requests to a CDN that answers —
        // then the package's own site.
        let declared = manifest_icons(&metadata);
        let mut outcome = if declared.is_empty() {
            Outcome::Nothing
        } else {
            cache_png(&declared, &source_stem(&declared), cache_dir)
        };
        if !outcome.is_found() {
            let homepage = metadata.PackageUrl().map(|url| url.to_string()).unwrap_or_default();
            if let Some(host) = host_of(&homepage) {
                let known = sites.lock().ok().and_then(|sites| sites.get(&host).cloned());
                let from_site = match known {
                    Some(cached) => cached,
                    None => {
                        let fetched = homepage_icon(&homepage, cache_dir);
                        if let Ok(mut sites) = sites.lock() {
                            // Settled answers only: a site that could not be
                            // reached once would otherwise stay that way for
                            // every package behind it in this call.
                            if !matches!(fetched, Outcome::Unreachable) {
                                sites.insert(host, fetched.clone());
                            }
                        }
                        fetched
                    }
                };
                outcome = outcome.or(from_site);
            }
        }

        match outcome {
            Outcome::Found(path) => publish(id, Some(&path), cache_dir),
            Outcome::Nothing => publish(id, None, cache_dir),
            // Something was there to fetch and the network got in the way.
            // Recording "no icon" would outlast the outage.
            Outcome::Unreachable => {}
        }
    });
}

/// What a lookup concluded. The distinction that matters is between a
/// package that has no icon anywhere — worth recording, so it is not looked
/// up again — and one whose icon could not be reached just now.
#[derive(Clone)]
enum Outcome {
    Found(PathBuf),
    Nothing,
    Unreachable,
}

impl Outcome {
    fn is_found(&self) -> bool {
        matches!(self, Outcome::Found(_))
    }

    /// What two lookups for the same package add up to. A package has no icon
    /// only when every source said so, so one source failing to answer leaves
    /// the answer open rather than settling it as "none".
    fn or(self, other: Outcome) -> Outcome {
        match (&self, &other) {
            (Outcome::Found(_), _) => self,
            (_, Outcome::Found(_)) => other,
            (Outcome::Unreachable, _) | (_, Outcome::Unreachable) => Outcome::Unreachable,
            _ => Outcome::Nothing,
        }
    }
}

/// Run `work` over the items on several threads, each taking the next item
/// nobody has started. Taking them in turn keeps the rows a person is looking
/// at first; splitting the list into a chunk per thread would instead scatter
/// the work across all of it.
fn in_parallel<T: Sync>(items: &[T], work: impl Fn(&T) + Sync) {
    // Reading a manifest costs over a second, almost all of it waiting on
    // winget's server, so this is wider than the core count — but only so far:
    // over the same 40 packages, 8 threads took 17.6s, 16 took 7.9s, and 32
    // took 13.2s, the server contending with itself.
    const WORKERS: usize = 16;

    if items.is_empty() {
        return;
    }
    let next = AtomicUsize::new(0);
    let work = &work;
    std::thread::scope(|scope| {
        for _ in 0..WORKERS.min(items.len()) {
            scope.spawn(|| {
                // Every thread that touches COM has to join the apartment.
                let _ = unsafe { CoInitializeEx(None, COINIT_MULTITHREADED) };
                loop {
                    let index = next.fetch_add(1, Ordering::Relaxed);
                    match items.get(index) {
                        Some(item) => work(item),
                        None => break,
                    }
                }
            });
        }
    });
}

// ---------------------------------------------------------------------------
// Icon sources
// ---------------------------------------------------------------------------

/// The icons a manifest declares, best first: a format Raycast renders (PNG
/// over ICO), then a theme-neutral one, then the largest.
///
/// All of them, not just the winner, because the ranking can leave several
/// tied — winget's catalog hands a few packages two icons that are alike in
/// every field it reports — and what separates those is only visible once
/// they are fetched.
fn manifest_icons(metadata: &bindings::Microsoft::Management::Deployment::CatalogPackageMetadata) -> Vec<String> {
    let Ok(icons) = metadata.Icons() else {
        return Vec::new();
    };
    let mut ranked: Vec<((u8, u8, i32), String)> = Vec::new();
    for index in 0..icons.Size().unwrap_or(0) {
        let Ok(icon) = icons.GetAt(index) else { continue };
        let (Ok(url), Ok(file_type), Ok(theme), Ok(resolution)) =
            (icon.Url(), icon.FileType(), icon.Theme(), icon.Resolution())
        else {
            continue;
        };
        let format_rank = match file_type {
            IconFileType::Png => 0,
            IconFileType::Ico => 1,
            _ => 2,
        };
        let theme_rank = if theme == IconTheme::Default { 0 } else { 1 };
        ranked.push(((format_rank, theme_rank, -resolution.0), url.to_string()));
    }
    // A stable sort, so icons the ranking cannot separate stay in the order
    // the manifest declared them.
    ranked.sort_by_key(|(rank, _)| *rank);
    ranked.into_iter().map(|(_, url)| url).collect()
}

/// The icon a package's own site offers, for packages whose manifest declares
/// none. Nothing about any particular site is assumed.
///
/// The conventional location is tried first because it is one request and
/// most sites answer it; reading the page to find what it declares costs a
/// second request and a far larger download, so it is the fallback. Both the
/// answer and the file it is cached under are keyed by host, so what is read
/// is the site's root rather than whichever page the package links to.
fn homepage_icon(homepage: &str, cache_dir: &str) -> Outcome {
    let Some(host) = host_of(homepage) else {
        return Outcome::Nothing;
    };
    let origin = format!("https://{host}");
    let stem = format!("site-{}", url_stem(&host));

    // cache_png answers from disk before touching the network, so a site
    // fetched by an earlier run costs nothing here.
    let conventional = cache_png(&[format!("{origin}/favicon.ico")], &stem, cache_dir);
    if conventional.is_found() {
        return conventional;
    }
    match fetch(&origin) {
        Ok(body) => conventional.or(cache_png(
            &declared_icons(&String::from_utf8_lossy(&body), &origin),
            &stem,
            cache_dir,
        )),
        // The page itself could not be read, so what it declares is unknown.
        Err(Outcome::Unreachable) => Outcome::Unreachable,
        Err(_) => conventional,
    }
}

/// Icon URLs a page declares, in document order.
fn declared_icons(html: &str, origin: &str) -> Vec<String> {
    let lowered = html.to_ascii_lowercase();
    let mut icons = Vec::new();
    let mut cursor = 0;
    while let Some(offset) = lowered.get(cursor..).and_then(|rest| rest.find("<link")) {
        let start = cursor + offset;
        let Some(length) = lowered.get(start..).and_then(|rest| rest.find('>')) else {
            break;
        };
        let (Some(tag), Some(tag_lowered)) = (html.get(start..start + length), lowered.get(start..start + length))
        else {
            break;
        };
        let is_icon = attribute(tag, tag_lowered, "rel")
            .map(|rel| rel.to_ascii_lowercase().split_whitespace().any(|word| word == "icon"))
            .unwrap_or(false);
        if is_icon {
            if let Some(url) = attribute(tag, tag_lowered, "href").and_then(|href| absolute_url(&href, origin)) {
                icons.push(url);
            }
        }
        cursor = start + length;
    }
    icons
}

/// Read one attribute out of a tag.
fn attribute(tag: &str, lowered: &str, name: &str) -> Option<String> {
    let at = lowered.find(&format!("{name}="))? + name.len() + 1;
    let rest = tag.get(at..)?;
    let quote = rest.chars().next()?;
    if quote == '"' || quote == '\'' {
        let value = rest.get(1..)?;
        return value.find(quote).and_then(|end| value.get(..end)).map(str::to_string);
    }
    Some(rest.split_whitespace().next()?.trim_end_matches('>').to_string())
}

/// Turn an href into an absolute URL, resolved against the URL it was found
/// at: a leading slash against that URL's origin, anything else against the
/// directory it names, as RFC 3986 requires.
fn absolute_url(href: &str, base: &str) -> Option<String> {
    let href = href.trim();
    if href.is_empty() {
        return None;
    }
    if href.starts_with("http://") || href.starts_with("https://") {
        return Some(href.to_string());
    }
    if let Some(rest) = href.strip_prefix("//") {
        return Some(format!("https://{rest}"));
    }
    let base = base.split(['?', '#']).next()?;
    let authority = base.find("://")? + "://".len();
    let root = authority + base.get(authority..)?.find('/').unwrap_or(base.len() - authority);
    if href.starts_with('/') {
        return Some(format!("{}{href}", base.get(..root)?));
    }
    let directory = base.get(root..)?.rfind('/').map_or(root, |at| root + at);
    Some(format!("{}/{href}", base.get(..directory)?))
}

/// Refuse anything but a public HTTPS destination. Icon and homepage URLs
/// come from package metadata, which the package author controls, so they
/// must not be able to point this process at the machine's own network.
fn is_public_https(url: &str) -> bool {
    if !url.starts_with("https://") {
        return false;
    }
    let Some(host) = host_of(url) else { return false };
    if host == "localhost" || host.ends_with(".localhost") {
        return false;
    }
    match host.parse::<IpAddr>() {
        Ok(address) => is_public_address(&address),
        // A name says nothing about where it points until it is resolved,
        // which `PublicOnly` does before a connection is made.
        Err(_) => true,
    }
}

/// The addresses this process may talk to: everything except the machine
/// itself and the network it sits on.
fn is_public_address(address: &IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => {
            !(address.is_loopback()
                || address.is_private()
                || address.is_link_local()
                || address.is_unspecified()
                || address.is_broadcast()
                || address.is_documentation())
        }
        IpAddr::V6(address) => {
            // A mapped address is an IPv4 one wearing IPv6 notation, and the
            // IPv6 predicates say nothing about what it maps to.
            if let Some(mapped) = address.to_ipv4_mapped() {
                return is_public_address(&IpAddr::V4(mapped));
            }
            let leading = address.segments()[0];
            // Unique-local (fc00::/7) and link-local (fe80::/10) have no
            // stable predicates yet.
            !(address.is_loopback()
                || address.is_unspecified()
                || leading & 0xfe00 == 0xfc00
                || leading & 0xffc0 == 0xfe80)
        }
    }
}

/// Name resolution that hands back public addresses only.
///
/// The URL check refuses a private destination written as an address, but a
/// name carries no such evidence: a package can name a host that resolves to
/// the loopback interface or to something on the machine's own network.
/// Filtering what the name resolved to applies the same rule where the
/// connection is actually made, leaving no gap between check and connect.
#[derive(Debug)]
struct PublicOnly(DefaultResolver);

impl Resolver for PublicOnly {
    fn resolve(&self, uri: &Uri, config: &Config, timeout: NextTimeout) -> Result<ResolvedSocketAddrs, ureq::Error> {
        let resolved = self.0.resolve(uri, config, timeout)?;
        let mut public = self.empty();
        for address in resolved.iter().filter(|address| is_public_address(&address.ip())) {
            public.push(*address);
        }
        if public.is_empty() {
            return Err(ureq::Error::HostNotFound);
        }
        Ok(public)
    }
}

/// The host a URL points at, lowercased and without credentials, port, or the
/// brackets an IPv6 address is written in.
fn host_of(url: &str) -> Option<String> {
    let authority = url.split_once("://").map_or(url, |(_, rest)| rest);
    let authority = authority.split(['/', '?', '#']).next()?;
    let authority = authority.rsplit_once('@').map_or(authority, |(_, host)| host);
    let host = match authority.strip_prefix('[') {
        // Everything to the closing bracket is the address; only what follows
        // it can be a port.
        Some(literal) => literal.split(']').next()?,
        None => authority.split(':').next()?,
    };
    // A trailing dot names the same host to a resolver.
    let host = host.trim_end_matches('.').to_ascii_lowercase();
    (!host.is_empty()).then_some(host)
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/// One agent for the process: it owns the connection pool, so the several
/// requests a single site costs — its conventional icon, its page, then what
/// the page declares — share one connection and one TLS handshake.
fn http_agent() -> &'static ureq::Agent {
    static AGENT: OnceLock<ureq::Agent> = OnceLock::new();
    AGENT.get_or_init(build_agent)
}

fn build_agent() -> ureq::Agent {
    let config = ureq::Agent::config_builder()
        .timeout_global(Some(REQUEST_TIMEOUT))
        // fetch() follows redirects itself so it can check each hop, and
        // reads the status itself: a 404 is an answer ("no icon here"),
        // while the error the client would raise instead is
        // indistinguishable from the connection never landing.
        .max_redirects(0)
        .http_status_as_error(false)
        // SChannel, the platform's own TLS. The alternative pulls in a
        // C library, which cannot be cross-compiled by the extension CI's
        // macOS runners. Its roots have to come from the platform too:
        // against the bundled set, SChannel rejects perfectly ordinary
        // chains it cannot terminate there (gitkraken.com, for one).
        .tls_config(
            TlsConfig::builder()
                .provider(TlsProvider::NativeTls)
                .root_certs(RootCerts::PlatformVerifier)
                .build(),
        )
        .build();
    ureq::Agent::with_parts(config, DefaultConnector::new(), PublicOnly(DefaultResolver::default()))
}

/// Downloaded images live in their own subdirectory, keyed by where they came
/// from, so packages sharing a vendor site fetch it once. The files the view
/// reads are the per-package ones in the directory above.
fn source_dir(cache_dir: &str) -> PathBuf {
    PathBuf::from(cache_dir).join("sources")
}

/// A filename-safe, collision-free key for a URL. Hashed rather than derived
/// from the URL's text: manifests may name an icon anything at all, so two
/// packages can share a basename ("logo.png") while pointing at different
/// images, and a basename may contain characters a path cannot.
fn url_stem(url: &str) -> String {
    let mut hasher = DefaultHasher::new();
    url.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// The key a set of candidates caches under. The whole set, because which one
/// wins depends on all of them: two packages that share a first choice but
/// not a second would otherwise read each other's answer.
fn source_stem(sources: &[String]) -> String {
    match sources {
        [only] => url_stem(only),
        _ => url_stem(&sources.join("\n")),
    }
}

/// Fetch a URL that package metadata supplied, refusing any destination that
/// is not public HTTPS.
///
/// Redirects are followed by hand: the client would otherwise chase them
/// itself, and a public URL that redirects inward would reach exactly the
/// hosts the check exists to keep this process away from.
/// `Nothing` means the destination answered and had nothing to give — it was
/// refused, or it is gone. `Unreachable` means the request never got an
/// answer, which says nothing about whether an icon exists.
fn fetch(url: &str) -> Result<Vec<u8>, Outcome> {
    let agent = http_agent();
    let deadline = Instant::now() + REQUEST_TIMEOUT;
    let mut target = url.to_string();

    for _ in 0..=MAX_REDIRECTS {
        if !is_public_https(&target) {
            return Err(Outcome::Nothing);
        }
        // The agent's timeout is per request, and each hop is one; spending
        // what is left of the source's budget keeps a redirect chain from
        // costing a multiple of it.
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            return Err(Outcome::Unreachable);
        }
        let Ok(response) = agent
            .get(&target)
            .config()
            .timeout_global(Some(remaining))
            .build()
            .header("User-Agent", USER_AGENT)
            .call()
        else {
            return Err(Outcome::Unreachable);
        };
        let status = response.status();
        if status.is_redirection() {
            let next = response
                .headers()
                .get("location")
                .and_then(|location| location.to_str().ok())
                .and_then(|location| absolute_url(location, &target));
            match next {
                Some(location) => {
                    target = location;
                    continue;
                }
                None => return Err(Outcome::Nothing),
            }
        }
        if status.is_server_error() {
            return Err(Outcome::Unreachable);
        }
        if !status.is_success() {
            return Err(Outcome::Nothing);
        }
        // An icon is a few kilobytes; anything past the cap is not one.
        // Reading one byte past it is what tells a body that ended from a
        // body that was cut off, which would decode to a mangled image.
        let mut body = Vec::new();
        if response
            .into_body()
            .into_reader()
            .take(MAX_DOWNLOAD_BYTES + 1)
            .read_to_end(&mut body)
            .is_err()
        {
            return Err(Outcome::Unreachable);
        }
        if body.len() as u64 > MAX_DOWNLOAD_BYTES {
            return Err(Outcome::Nothing);
        }
        return Ok(body);
    }
    // A chain this long is not leading anywhere, and retrying repeats it.
    Err(Outcome::Nothing)
}

/// Download a source, transcode it to PNG, and cache it. Storing PNG rather
/// than what the site served also spares the renderer ICO decoding, which it
/// handles poorly.
///
/// Sources are in order of preference, and the first that answers with an
/// icon settles it — except that an icon is drawn in a square slot, so a
/// source that is not square is kept only until a square one turns up. Where
/// a package offers several icons and nothing in the metadata separates them,
/// which winget's catalog does for a handful of packages, that shape is the
/// only thing left to tell a drawn icon from whatever else was extracted
/// alongside it.
fn cache_png(sources: &[String], stem: &str, cache_dir: &str) -> Outcome {
    if stem.is_empty() {
        return Outcome::Nothing;
    }
    let dir = source_dir(cache_dir);
    let path = dir.join(format!("{stem}.png"));
    if path.exists() {
        return Outcome::Found(path);
    }
    if fs::create_dir_all(&dir).is_err() {
        return Outcome::Unreachable;
    }

    let mut unreachable = false;
    let mut best = None;
    for url in sources {
        let body = match fetch(url) {
            Ok(body) => body,
            Err(Outcome::Unreachable) => {
                unreachable = true;
                continue;
            }
            Err(_) => continue,
        };

        // The limits go to the decoder rather than the decoded image: a small
        // file can describe an enormous surface, and checking afterwards
        // means the allocation has already happened — sixteen of those at
        // once would be the whole worker's memory.
        let Ok(mut reader) = image::ImageReader::new(Cursor::new(&body)).with_guessed_format() else {
            continue;
        };
        let mut limits = image::Limits::default();
        limits.max_image_width = Some(MAX_ICON_PIXELS);
        limits.max_image_height = Some(MAX_ICON_PIXELS);
        limits.max_alloc = Some(MAX_DECODE_BYTES);
        reader.limits(limits);

        let Ok(decoded) = reader.decode() else { continue };
        if decoded.width() == decoded.height() {
            best = Some(decoded);
            break;
        }
        // Not the shape of an icon, so keep looking — but do not come back
        // empty-handed if nothing better answers.
        best.get_or_insert(decoded);
    }
    let Some(icon) = best else {
        // Every source answered and none of them held an icon — unless one
        // never answered at all, which is worth another try later.
        return if unreachable { Outcome::Unreachable } else { Outcome::Nothing };
    };
    if icon.save_with_format(&path, image::ImageFormat::Png).is_err() {
        return Outcome::Nothing;
    }
    // Plenty of icons are a dark glyph on transparency — GitHub's among them,
    // which stands in for every package that names GitHub as its site — and
    // those disappear against a dark window. A light backing is written
    // alongside for the view to use when the theme calls for it.
    let drawn = icon.into_rgba8();
    if hides_on_dark(&drawn) {
        let _ = on_light_backing(&drawn).save_with_format(backed_path(&path), image::ImageFormat::Png);
    }
    Outcome::Found(path)
}

/// The light-backed companion to a cached image, by convention its
/// neighbour. Both the source cache and the published files use it.
fn backed_path(path: &Path) -> PathBuf {
    path.with_extension("backed.png")
}

/// Whether an icon would be all but invisible against a dark window: next to
/// none of what it draws stands out from the background behind it.
///
/// Contrast rather than brightness, because the two disagree on the cases
/// that matter: a saturated red glyph is dark by any brightness measure and
/// perfectly legible on black, while a near-black one is neither. Transparent
/// pixels are not part of the drawing, so they are not counted.
fn hides_on_dark(icon: &image::RgbaImage) -> bool {
    /// Relative luminance of the window a dark-theme row is drawn on.
    const BACKGROUND: f32 = 0.0075;
    /// WCAG's ratio for large text, and about where a shape stops reading as
    /// separate from what is behind it.
    const CONTRAST: f32 = 3.0;
    /// Below this share of the drawing standing out, there is nothing to see.
    const STANDS_OUT: f32 = 0.05;
    /// Anything fainter than this is background, not the drawing.
    const OPAQUE_ENOUGH: u8 = 128;

    // sRGB is not linear in light, and luminance is a sum of light. A channel
    // has 256 values, so the conversion is a table rather than a power per
    // pixel — an icon at the decode cap is four million of them.
    static LINEAR: OnceLock<[f32; 256]> = OnceLock::new();
    let linear = LINEAR.get_or_init(|| {
        std::array::from_fn(|value| {
            let channel = value as f32 / 255.0;
            if channel <= 0.04045 {
                channel / 12.92
            } else {
                ((channel + 0.055) / 1.055).powf(2.4)
            }
        })
    });

    let mut drawn: u32 = 0;
    let mut standing_out: u32 = 0;
    for pixel in icon.pixels() {
        let [red, green, blue, alpha] = pixel.0;
        if alpha < OPAQUE_ENOUGH {
            continue;
        }
        drawn += 1;
        let luminance =
            0.2126 * linear[red as usize] + 0.7152 * linear[green as usize] + 0.0722 * linear[blue as usize];
        // WCAG's ratio, which both directions of the comparison feed into: a
        // pixel lighter than the window stands out, and so does a darker one.
        if (luminance.max(BACKGROUND) + 0.05) / (luminance.min(BACKGROUND) + 0.05) >= CONTRAST {
            standing_out += 1;
        }
    }
    drawn > 0 && (standing_out as f32) < STANDS_OUT * drawn as f32
}

/// The icon centred on a white rounded square, in Raycast's proportions.
fn on_light_backing(icon: &image::RgbaImage) -> image::RgbaImage {
    /// Fractions of the backing's size: the inset the icon sits in, and the
    /// corner radius, both matching how Raycast draws app icons.
    const INSET: f32 = 0.14;
    const RADIUS: f32 = 0.225;
    /// The backing is only ever drawn at row size. Building it from an icon
    /// at the decode cap would cost a surface twice that on every worker, for
    /// detail nothing renders.
    const MAX_SIDE: u32 = 512;

    let side = icon.width().max(icon.height());
    let icon = if side > MAX_SIDE {
        let scale = MAX_SIDE as f32 / side as f32;
        let scaled = |length: u32| ((length as f32 * scale).round() as u32).max(1);
        Cow::Owned(image::imageops::resize(
            icon,
            scaled(icon.width()),
            scaled(icon.height()),
            image::imageops::FilterType::Lanczos3,
        ))
    } else {
        Cow::Borrowed(icon)
    };

    let side = icon.width().max(icon.height());
    let backing_side = ((side as f32) / (1.0 - 2.0 * INSET)).round().max(1.0) as u32;
    let radius = backing_side as f32 * RADIUS;

    let mut backing = image::RgbaImage::new(backing_side, backing_side);
    for (x, y, pixel) in backing.enumerate_pixels_mut() {
        *pixel = image::Rgba(if inside_rounded_square(x, y, backing_side, radius) {
            [255, 255, 255, 255]
        } else {
            [0, 0, 0, 0]
        });
    }

    let left = (backing_side - icon.width()) / 2;
    let top = (backing_side - icon.height()) / 2;
    image::imageops::overlay(&mut backing, icon.as_ref(), left as i64, top as i64);
    backing
}

/// Whether a pixel falls inside a square with rounded corners: outside the
/// corner boxes it always does, inside one it depends on the arc.
fn inside_rounded_square(x: u32, y: u32, side: u32, radius: f32) -> bool {
    let (x, y, side) = (x as f32 + 0.5, y as f32 + 0.5, side as f32);
    let from_left = x.min(side - x);
    let from_top = y.min(side - y);
    if from_left >= radius || from_top >= radius {
        return true;
    }
    let (dx, dy) = (radius - from_left, radius - from_top);
    dx * dx + dy * dy <= radius * radius
}

/// Publish a package's outcome where the view can see it immediately: the
/// image under the package's id, or an empty marker recording that there is
/// none, so it is not looked up again.
fn publish(id: &str, image: Option<&PathBuf>, cache_dir: &str) {
    // Ids reach the filesystem as names, so anything outside a plain set is
    // percent-encoded — the view encodes the same way to find the file.
    let mut stem = String::with_capacity(id.len());
    for byte in id.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'.' | b'_' | b'-' => stem.push(*byte as char),
            _ => stem.push_str(&format!("%{byte:02X}")),
        }
    }
    let dir = PathBuf::from(cache_dir);
    if fs::create_dir_all(&dir).is_err() {
        return;
    }
    match image {
        // Copied rather than linked: the view lists this one directory, and a
        // few kilobytes cost nothing.
        // The backing goes first: the view keys on the icon itself, so
        // writing that last means whatever a repaint finds is complete.
        Some(source) => {
            let backed = backed_path(source);
            if backed.exists() {
                let _ = fs::copy(&backed, dir.join(format!("{stem}.backed.png")));
            }
            let _ = fs::copy(source, dir.join(format!("{stem}.png")));
        }
        None => {
            let _ = fs::write(dir.join(format!("{stem}.none")), []);
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_host_a_url_actually_contacts() {
        assert_eq!(host_of("https://example.com/icon.png").as_deref(), Some("example.com"));
        assert_eq!(host_of("https://EXAMPLE.com:8443/x").as_deref(), Some("example.com"));
        assert_eq!(host_of("https://user:pass@example.com/x").as_deref(), Some("example.com"));
        // A trailing dot is the same host to a resolver.
        assert_eq!(host_of("https://localhost./x").as_deref(), Some("localhost"));
        // An address in brackets, whose colons are not a port.
        assert_eq!(host_of("https://[::1]:443/x").as_deref(), Some("::1"));
        // The scheme separator can appear again inside the path.
        assert_eq!(
            host_of("https://example.com/r?url=https://internal/").as_deref(),
            Some("example.com")
        );
        assert_eq!(host_of("https:///x"), None);
    }

    #[test]
    fn refuses_destinations_off_the_public_internet() {
        assert!(is_public_https("https://example.com/icon.png"));
        assert!(is_public_https("https://93.184.216.34/icon.png"));

        assert!(!is_public_https("http://example.com/icon.png"));
        assert!(!is_public_https("https://localhost/icon.png"));
        assert!(!is_public_https("https://localhost./icon.png"));
        assert!(!is_public_https("https://api.localhost/icon.png"));
        assert!(!is_public_https("https://127.0.0.1/icon.png"));
        assert!(!is_public_https("https://10.1.2.3/icon.png"));
        assert!(!is_public_https("https://192.168.0.1/icon.png"));
        assert!(!is_public_https("https://169.254.169.254/icon.png"));
        assert!(!is_public_https("https://[::1]/icon.png"));
        assert!(!is_public_https("https://[fe80::1]/icon.png"));
        assert!(!is_public_https("https://[fd00::1]/icon.png"));
        // An IPv4 address in IPv6 notation is still that address.
        assert!(!is_public_https("https://[::ffff:127.0.0.1]/icon.png"));
    }

    #[test]
    fn resolves_hrefs_against_the_url_they_were_found_at() {
        let page = "https://example.com/products/editor/";
        assert_eq!(
            absolute_url("https://cdn.example.com/logo.png", page).as_deref(),
            Some("https://cdn.example.com/logo.png")
        );
        assert_eq!(
            absolute_url("//cdn.example.com/logo.png", page).as_deref(),
            Some("https://cdn.example.com/logo.png")
        );
        assert_eq!(
            absolute_url("/favicon.ico", page).as_deref(),
            Some("https://example.com/favicon.ico")
        );
        assert_eq!(
            absolute_url("logo.png", page).as_deref(),
            Some("https://example.com/products/editor/logo.png")
        );
        // A relative destination is relative to the directory, not the file.
        assert_eq!(
            absolute_url("logo-v2.png", "https://cdn.example.com/assets/icons/logo.png").as_deref(),
            Some("https://cdn.example.com/assets/icons/logo-v2.png")
        );
        assert_eq!(
            absolute_url("logo.png", "https://example.com").as_deref(),
            Some("https://example.com/logo.png")
        );
        assert_eq!(absolute_url("   ", page), None);
    }

    #[test]
    fn keeps_the_stronger_of_two_answers() {
        let found = || Outcome::Found(PathBuf::from("icon.png"));
        assert!(found().or(Outcome::Nothing).is_found());
        assert!(Outcome::Unreachable.or(found()).is_found());
        // One source that never answered leaves the package unsettled, so it
        // is looked at again rather than recorded as having no icon.
        assert!(matches!(Outcome::Unreachable.or(Outcome::Nothing), Outcome::Unreachable));
        assert!(matches!(Outcome::Nothing.or(Outcome::Unreachable), Outcome::Unreachable));
        assert!(matches!(Outcome::Nothing.or(Outcome::Nothing), Outcome::Nothing));
    }

    #[test]
    fn backs_only_what_a_dark_window_would_swallow() {
        let square = |pixel: [u8; 4]| image::RgbaImage::from_pixel(8, 8, image::Rgba(pixel));
        // A black glyph on transparency: GitHub's, and every package that
        // names GitHub as its site.
        let mut glyph = image::RgbaImage::new(8, 8);
        glyph.put_pixel(4, 4, image::Rgba([26, 26, 26, 255]));
        assert!(hides_on_dark(&glyph));
        assert!(hides_on_dark(&square([0, 0, 0, 255])));

        // Dark by brightness, legible on black.
        assert!(!hides_on_dark(&square([255, 0, 0, 255])));
        assert!(!hides_on_dark(&square([255, 255, 255, 255])));
        // Nothing drawn at all.
        assert!(!hides_on_dark(&image::RgbaImage::new(8, 8)));
    }
}
