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

use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::net::IpAddr;
use std::io::{Cursor, Read};
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use raycast_rust_macros::raycast;
use ureq::tls::{RootCerts, TlsConfig, TlsProvider};
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

/// A single request may not hang the run: an unreachable vendor host would
/// otherwise hold a worker until the OS gives up. Short, because a slow host
/// costs its row an icon for this pass either way.
const REQUEST_TIMEOUT: Duration = Duration::from_millis(2_500);
/// Caps on what a remote source may cost: bytes read, and the surface an
/// image is allowed to decode to.
const MAX_DOWNLOAD_BYTES: u64 = 4 * 1024 * 1024;
const MAX_ICON_PIXELS: u32 = 2_048;

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
    let sites: Mutex<HashMap<String, Option<PathBuf>>> = Mutex::new(HashMap::new());

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

        // The manifest's own icon first — one request to a CDN that answers —
        // then the package's own site.
        let mut image = manifest_icon(&metadata).and_then(|url| cache_png(&[url.clone()], &url_stem(&url), cache_dir));
        if image.is_none() {
            let homepage = metadata.PackageUrl().map(|url| url.to_string()).unwrap_or_default();
            if let Some(host) = host_of(&homepage) {
                let known = sites.lock().ok().and_then(|sites| sites.get(&host).cloned());
                image = match known {
                    Some(cached) => cached,
                    None => {
                        let fetched = homepage_icon(&homepage, cache_dir);
                        if let Ok(mut sites) = sites.lock() {
                            sites.insert(host, fetched.clone());
                        }
                        fetched
                    }
                };
            }
        }

        publish(id, image.as_ref(), cache_dir);
    });
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

/// The best icon a manifest declares: a format Raycast renders (PNG over
/// ICO), then a theme-neutral one, then the largest.
fn manifest_icon(metadata: &bindings::Microsoft::Management::Deployment::CatalogPackageMetadata) -> Option<String> {
    let icons = metadata.Icons().ok()?;
    let mut best: Option<((u8, u8, i32), String)> = None;
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
        let rank = (format_rank, theme_rank, -resolution.0);
        if best.as_ref().is_none_or(|(current, _)| rank < *current) {
            best = Some((rank, url.to_string()));
        }
    }
    best.map(|(_, url)| url)
}

/// The icon a package's own homepage offers, for packages whose manifest
/// declares none. Nothing about any particular site is assumed.
///
/// The conventional location is tried first because it is one request and
/// most sites answer it; reading the page to find what it declares costs a
/// second request and a far larger download, so it is the fallback.
fn homepage_icon(homepage: &str, cache_dir: &str) -> Option<PathBuf> {
    let host = host_of(homepage)?;
    let origin = format!("https://{host}");
    let stem = format!("site-{}", url_stem(&host));

    // cache_png answers from disk before touching the network, so a site
    // fetched by an earlier run costs nothing here.
    if let Some(path) = cache_png(&[format!("{origin}/favicon.ico")], &stem, cache_dir) {
        return Some(path);
    }
    if !is_public_https(&origin) {
        return None;
    }
    let declared = http_agent()
        .get(&origin)
        .header("User-Agent", USER_AGENT)
        .call()
        .ok()
        .and_then(|response| response.into_body().with_config().limit(MAX_DOWNLOAD_BYTES).read_to_string().ok())
        .map(|html| declared_icons(&html, &origin))
        .unwrap_or_default();
    cache_png(&declared, &stem, cache_dir)
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

/// Turn an href found in a page into an absolute URL.
fn absolute_url(href: &str, origin: &str) -> Option<String> {
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
    if href.starts_with('/') {
        return Some(format!("{origin}{href}"));
    }
    Some(format!("{origin}/{href}"))
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
    match host.trim_start_matches('[').trim_end_matches(']').parse::<IpAddr>() {
        Ok(IpAddr::V4(address)) => {
            !(address.is_loopback() || address.is_private() || address.is_link_local() || address.is_unspecified())
        }
        Ok(IpAddr::V6(address)) => {
            let leading = address.segments()[0];
            // Unique-local (fc00::/7) and link-local (fe80::/10) have no
            // stable predicates yet.
            !(address.is_loopback()
                || address.is_unspecified()
                || leading & 0xfe00 == 0xfc00
                || leading & 0xffc0 == 0xfe80)
        }
        // A name, not an address: it resolves publicly or not at all.
        Err(_) => true,
    }
}

/// The host a homepage points at, lowercased and without credentials or port.
fn host_of(homepage: &str) -> Option<String> {
    let host = homepage
        .split("://")
        .last()?
        .split('/')
        .next()?
        .rsplit('@')
        .next()?
        .split(':')
        .next()?
        .to_ascii_lowercase();
    (!host.is_empty()).then_some(host)
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

fn http_agent() -> ureq::Agent {
    ureq::Agent::new_with_config(
        ureq::Agent::config_builder()
            .timeout_global(Some(REQUEST_TIMEOUT))
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
            .build(),
    )
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

/// Download the first source that answers, transcode it to PNG, and cache it.
/// Storing PNG rather than what the site served also spares the renderer ICO
/// decoding, which it handles poorly.
fn cache_png(sources: &[String], stem: &str, cache_dir: &str) -> Option<PathBuf> {
    if stem.is_empty() {
        return None;
    }
    let dir = source_dir(cache_dir);
    let path = dir.join(format!("{stem}.png"));
    if path.exists() {
        return Some(path);
    }
    fs::create_dir_all(&dir).ok()?;

    let agent = http_agent();
    for url in sources {
        if !is_public_https(url) {
            continue;
        }
        let Ok(response) = agent.get(url).header("User-Agent", USER_AGENT).call() else {
            continue;
        };
        // An icon is a few kilobytes; anything beyond the cap is not one, and
        // the body arrives from wherever package metadata pointed.
        let mut body = Vec::new();
        if response
            .into_body()
            .into_reader()
            .take(MAX_DOWNLOAD_BYTES)
            .read_to_end(&mut body)
            .is_err()
        {
            continue;
        }
        let Ok(reader) = image::ImageReader::new(Cursor::new(&body)).with_guessed_format() else {
            continue;
        };
        let Ok(decoded) = reader.decode() else { continue };
        // A small image that decodes to an enormous surface is the other way
        // a remote file can cost more than it looks.
        if decoded.width() > MAX_ICON_PIXELS || decoded.height() > MAX_ICON_PIXELS {
            continue;
        }
        if decoded.save_with_format(&path, image::ImageFormat::Png).is_ok() {
            return Some(path);
        }
    }
    None
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
        Some(source) => {
            let _ = fs::copy(source, dir.join(format!("{stem}.png")));
        }
        None => {
            let _ = fs::write(dir.join(format!("{stem}.none")), []);
        }
    }
}
