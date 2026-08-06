// Favicon resolution for localhost dev servers. Headless (no @raycast/api):
// the dashboard fetches and caches these, the picker and the menu bar render
// them from the recents store. Decisions documented in the wiki's Favicons
// page.
//
// The resolver only ever talks to the dev server it is resolving for. Its icon
// candidates come out of that server's page HTML, which is untrusted input, and
// the bytes it fetches are inlined straight into the Raycast UI. So an icon URL
// must never turn into an arbitrary outbound GET: it could otherwise reach an
// external host or a private-network address the user never pointed us at.
// Every favicon fetch is therefore pinned to the server's own origin at every
// redirect hop, checked BEFORE each request goes out (fetchWithTimeout), with
// a final check on the URL the response actually came from.

// Fetch with a hard 3s timeout, never leaving `origin`. Returns null on any
// failure so callers can chain fallbacks cleanly without nested try/catch.
//
// Redirects are walked by hand because fetch's transparent mode contacts the
// destination before anyone can inspect it: a dev server that redirects off
// itself would turn our request into an outbound GET to a host the user
// never pointed us at, even though the response got discarded afterwards.
// Manual mode lets the walk stop BEFORE the off-origin request is made; the
// hop cap only bounds a redirect loop.
async function fetchWithTimeout(
  url: string,
  origin: string,
  init: RequestInit & { method?: string } = {},
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    let target = url;
    for (let hop = 0; hop < 4; hop++) {
      if (!isSameOrigin(target, origin)) return null;
      const res = await fetch(target, {
        ...init,
        redirect: "manual",
        signal: controller.signal,
      });
      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location) return res;
      target = new URL(location, target).toString();
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Does `url` sit on `origin`? Compares parsed origins, so the two sides agree
// on default-port and case normalization rather than on spelling. Anything
// unparseable counts as off-origin, and so does the empty string, which is what
// a response URL we cannot account for looks like.
function isSameOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === new URL(origin).origin;
  } catch {
    return false;
  }
}

// Some SVG favicons are authored as a single-color glyph that inherits the
// page's text color through `currentColor` and declare no color of their own.
// Raycast renders a data-URI SVG with no surrounding color context, so those
// collapse to a flat black square. Detect that specific case — currentColor
// AND no explicit fill/stroke/gradient color — so the resolver can prefer a
// real colored icon. A colored SVG that merely mentions currentColor on one
// sub-path is left alone, to avoid regressing icons that render fine today.
function isMonochromeSvg(svg: string): boolean {
  if (!/currentColor/i.test(svg)) return false;
  // Proof the SVG paints an explicit color somewhere: a hex/rgb/hsl value, a
  // gradient, or a CSS named color (red, navy, …). Keywords that aren't real
  // colors — currentColor/none/inherit/transparent/unset/initial/context-* —
  // don't count, so an SVG that only pairs currentColor with those stays
  // monochrome. (Named-color check via negative lookahead so it doesn't match
  // currentColor itself, which would defeat the whole test.)
  const hasExplicitColor =
    /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(?:#|rgb|hsl)/i.test(svg) ||
    /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(?!currentcolor|none|inherit|transparent|unset|initial|context-)[a-z]/i.test(
      svg,
    ) ||
    /<(?:linear|radial)Gradient\b/i.test(svg);
  return !hasExplicitColor;
}

// Fetch a favicon and return it as an inline data URI, or undefined if the URL
// doesn't serve an image. Inlining the bytes (rather than handing Raycast a
// URL to fetch) sidesteps CORS, since some dev servers (notably Astro) don't set
// Access-Control-Allow-Origin on static assets, and Raycast's image loader
// refuses those.
//
// SVG uses URL-encoded payload, raster uses base64. That split mirrors what
// @raycast/utils does internally for its own SVG icons.
//
// This is the single place every favicon fetch goes through, so it is also
// where the origin is enforced. `origin` is the dev server we are resolving
// for; a response that came from anywhere else is discarded unread.
async function fetchFaviconDataUri(
  url: string,
  origin: string,
  opts: { rejectMonochromeSvg?: boolean } = {},
): Promise<string | undefined> {
  const res = await fetchWithTimeout(url, origin);
  if (!res || !res.ok) return undefined;
  // fetchWithTimeout walked every hop on-origin, so this cannot fire; it
  // stays as the last line of defense at the single place bytes get inlined
  // into the UI. An empty res.url (a response we cannot account for) counts
  // as off-origin, same as always.
  if (!isSameOrigin(res.url, origin)) return undefined;
  const ct = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ct.startsWith("image/")) return undefined;
  if (ct.includes("svg")) {
    const svg = await res.text();
    // A monochrome/currentColor SVG would show as a black square; let the
    // caller fall through to a colored raster icon or the tinted fallback.
    if (opts.rejectMonochromeSvg && isMonochromeSvg(svg)) return undefined;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${ct};base64,${buf.toString("base64")}`;
}

// Dominant color of a cached SVG favicon, as a #rrggbb hex string, or
// undefined when no usable color can be extracted. For the menu bar, which
// cannot render an SVG favicon (it becomes a black template) but can tint its
// fallback glyph with the project's real brand color — far more recognizable
// at a glance than the framework badge color, which paints every SvelteKit
// project the same orange.
//
// "Dominant" here is textual, not rendered: the most frequent chromatic color
// painted by a fill/stroke/stop-color. Grays and near-black/white are ignored
// (they'd vanish against one menu theme or the other, and they're usually
// detail strokes, not brand). Ties go to the more saturated color, which for
// gradient logos picks the vivid stop rather than the washed-out one. No
// chromatic color at all — a genuinely monochrome logo — yields undefined so
// the caller keeps its existing fallback.
export function svgFaviconTint(dataUri: string): string | undefined {
  if (!dataUri.startsWith("data:image/svg")) return undefined;
  const comma = dataUri.indexOf(",");
  if (comma === -1) return undefined;
  const payload = dataUri.slice(comma + 1);
  let svg: string;
  try {
    svg = dataUri.slice(0, comma).includes(";base64")
      ? Buffer.from(payload, "base64").toString("utf8")
      : decodeURIComponent(payload);
  } catch {
    return undefined;
  }

  // Hex and rgb()/rgba() only. Named colors and hsl() are rare in favicon
  // SVGs; a logo using only those falls back like a monochrome one.
  const matches = svg.matchAll(
    /(?:fill|stroke|stop-color)\s*[:=]\s*["']?\s*(#[0-9a-f]{3,8}\b|rgba?\([^)]*\))/gi,
  );
  const counts = new Map<string, { count: number; chroma: number }>();
  for (const m of matches) {
    const rgb = parseColor(m[1]);
    if (!rgb) continue;
    const [r, g, b] = rgb;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = max - min;
    const lightness = (max + min) / 2 / 255;
    // Achromatic or near-invisible against a menu background: not brand.
    if (chroma < 25 || lightness < 0.12 || lightness > 0.9) continue;
    const hex = `#${[r, g, b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")}`;
    const entry = counts.get(hex) ?? { count: 0, chroma };
    entry.count += 1;
    counts.set(hex, entry);
  }

  let best: { hex: string; count: number; chroma: number } | undefined;
  for (const [hex, { count, chroma }] of counts) {
    if (
      !best ||
      count > best.count ||
      (count === best.count && chroma > best.chroma)
    ) {
      best = { hex, count, chroma };
    }
  }
  return best?.hex;
}

// "#rgb", "#rrggbb" (longer forms: alpha digits ignored), or "rgb(a)(...)" to
// [r, g, b]. Returns undefined for anything unparseable or fully transparent.
function parseColor(raw: string): [number, number, number] | undefined {
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b] = hex;
      return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    return undefined;
  }
  const nums = raw
    .slice(raw.indexOf("(") + 1, raw.indexOf(")"))
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (nums.length < 3) return undefined;
  const [r, g, b] = nums.map((n) =>
    n.endsWith("%") ? (parseFloat(n) / 100) * 255 : parseFloat(n),
  );
  const alpha = nums[3] !== undefined ? parseFloat(nums[3]) : 1;
  if ([r, g, b].some((v) => !Number.isFinite(v)) || alpha === 0)
    return undefined;
  return [Math.round(r), Math.round(g), Math.round(b)];
}

export interface ResolvedFavicons {
  // Best overall icon for the dashboard's List, which renders SVGs in color.
  best?: string;
  // Raster-only icon (PNG/ICO) for the menu bar, which renders SVG images as a
  // monochrome black template and so can't display an SVG favicon in color.
  raster?: string;
}

// Resolve favicons for a localhost dev server. Collects every icon <link> in
// the page HTML that points back at that same server and fetches them
// best-first — that document order is arbitrary and routinely lists a
// monochrome Safari mask-icon (a black silhouette) ahead of the real icon,
// which is why some favicons render as a black blob. Ranking, high→low:
//   3. colored raster — apple-touch-icon, or an icon whose type/extension is
//      png/ico/jpg/webp/gif. Raster keeps its own colors, so it never blackens.
//   2. SVG icons — used only when they aren't currentColor-monochrome.
//   1. anything else icon-ish (type/extension unknown; content-type decides).
// `rel="mask-icon"` is skipped outright (monochrome by design).
//
// Returns two icons: `best` for the dashboard (SVG allowed), and a `raster`
// variant for the menu bar. When the page only declares an SVG, `raster` is
// filled from the conventional paths (/favicon.ico, /apple-touch-icon.png) so
// the menu bar can still show a real icon instead of falling back to a dot.
export async function detectFavicons(port: string): Promise<ResolvedFavicons> {
  const origin = `http://localhost:${port}`;

  // The page read gets the same origin pin as the icon fetches below
  // (fetchWithTimeout refuses to follow a hop off this server): a root that
  // redirects elsewhere yields no HTML, and the conventional-path probes
  // still run.
  const html = await fetchWithTimeout(`${origin}/`, origin).then((r) =>
    r ? r.text() : null,
  );

  const candidates: Array<{ url: string; rank: number }> = [];
  if (html) {
    const linkTags = html.match(/<link[^>]+>/gi) ?? [];
    for (const tag of linkTags) {
      const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1].toLowerCase();
      if (!rel) continue;
      // Safari's pinned-tab icon is a black silhouette meant to be tinted by
      // the browser; taken as-is it renders as a black blob.
      if (rel.includes("mask-icon")) continue;
      const isAppleTouch = rel.includes("apple-touch-icon");
      if (!isAppleTouch && !/\bicon\b/.test(rel)) continue;

      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (!href) continue;
      // An absolute href is only a candidate if it names this same dev server.
      // A page whose icon lives on a CDN, or anywhere else, gets no fetch at
      // all: the conventional-path probes below still find an icon for it.
      if (href.startsWith("http") && !isSameOrigin(href, origin)) continue;
      const url = href.startsWith("http")
        ? href
        : `${origin}${href.startsWith("/") ? href : `/${href}`}`;

      const type = (
        tag.match(/type=["']([^"']+)["']/i)?.[1] ?? ""
      ).toLowerCase();
      const isSvg = type.includes("svg") || /\.svg(?:[?#]|$)/i.test(url);
      const isRaster =
        !isSvg &&
        (isAppleTouch ||
          type.startsWith("image/") ||
          /\.(?:png|ico|jpe?g|webp|gif)(?:[?#]|$)/i.test(url));
      candidates.push({ url, rank: isRaster ? 3 : isSvg ? 2 : 1 });
    }
  }

  // Array.sort is stable in V8, so document order is preserved within a rank.
  candidates.sort((a, b) => b.rank - a.rank);

  let best: string | undefined;
  let raster: string | undefined;
  const consider = (dataUri: string | undefined) => {
    if (!dataUri) return;
    if (!best) best = dataUri;
    if (!raster && !dataUri.startsWith("data:image/svg")) raster = dataUri;
  };

  for (const c of candidates) {
    if (best && raster) break;
    consider(
      await fetchFaviconDataUri(c.url, origin, { rejectMonochromeSvg: true }),
    );
  }

  // The page declared no usable raster (SVG-only, or no icons at all). Probe the
  // conventional raster paths so the menu bar still gets a real icon; these also
  // serve as the universal fallback when nothing was declared in the HTML.
  if (!best || !raster) {
    for (const path of ["/favicon.ico", "/apple-touch-icon.png"]) {
      if (best && raster) break;
      consider(await fetchFaviconDataUri(`${origin}${path}`, origin));
    }
  }

  return { best, raster };
}
