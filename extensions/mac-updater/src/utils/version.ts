// Port of Latest's VersionParser + comparison, simplified for JS.

export interface ParsedVersion {
  version: string;
  build: string;
}

export function parseVersion(
  rawVersion: string,
  rawBuild: string,
): ParsedVersion {
  let version = (rawVersion ?? "").trim();
  let build = (rawBuild ?? "").trim();

  // Strip leading "v" or "Build "
  version = version.replace(/^v(?=\d)/i, "").replace(/^Build\s+/i, "");

  // Strip noisy suffixes
  version = version
    .replace(/-HEAD-.*$/i, "")
    .replace(/-stable.*$/i, "")
    .replace(/\.osx$/i, "")
    .replace(/-(release|latest|demo|beta|stable)$/i, "");

  // Build patterns
  // 1.2 (r1234) / 1.2 (1234)
  const parens = build.match(/^.+\(\s*r?(\d[\w.]*)\s*\)$/);
  if (parens) build = parens[1];
  // 1.2/312
  const slash = build.match(/^[\d.]+\/(\d[\w.]*)$/);
  if (slash) build = slash[1];
  // IU-1234
  const prefix = build.match(/^[A-Z]{2}-(\d[\w.]*)$/);
  if (prefix) build = prefix[1];

  return { version, build };
}

function tokenize(v: string): Array<{ kind: "num" | "str"; val: string }> {
  const tokens: Array<{ kind: "num" | "str"; val: string }> = [];
  const re = /(\d+|[a-zA-Z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(v)) !== null) {
    tokens.push({ kind: /^\d+$/.test(m[1]) ? "num" : "str", val: m[1] });
  }
  return tokens;
}

// returns 1 if a>b, -1 if a<b, 0 if equal
export function compareVersion(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const len = Math.max(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const x = ta[i];
    const y = tb[i];
    if (!x) return isZeroPad(tb.slice(i)) ? 0 : -1;
    if (!y) return isZeroPad(ta.slice(i)) ? 0 : 1;
    if (x.kind === "num" && y.kind === "num") {
      const nx = parseInt(x.val, 10);
      const ny = parseInt(y.val, 10);
      if (nx !== ny) return nx > ny ? 1 : -1;
    } else if (x.kind === "str" && y.kind === "str") {
      if (x.val !== y.val) return x.val > y.val ? 1 : -1;
    } else {
      // num beats str (1.2 > 1.b)
      return x.kind === "num" ? 1 : -1;
    }
  }
  return 0;
}

function isZeroPad(rest: Array<{ kind: "num" | "str"; val: string }>): boolean {
  return rest.every((t) => t.kind === "num" && parseInt(t.val, 10) === 0);
}

export function hasUpdate(
  currentVersion: string,
  currentBuild: string,
  latestVersion: string,
  latestBuild?: string,
): boolean {
  const cur = parseVersion(currentVersion, currentBuild);
  const lat = parseVersion(latestVersion, latestBuild ?? "");

  // Prefer build comparison when both have meaningful builds
  if (
    cur.build &&
    lat.build &&
    cur.build !== cur.version &&
    lat.build !== lat.version
  ) {
    const r = compareVersion(lat.build, cur.build);
    if (r !== 0) return r > 0;
  }

  // Google-Drive-style mismatch: the installed app reports
  //   CFBundleShortVersionString = "126.0"   (marketing version)
  //   CFBundleVersion            = "126.0.4" (real version)
  // but Homebrew's cask only exposes one version field — "126.0.4". Comparing
  // lat.version ("126.0.4") to cur.version ("126.0") would forever say
  // "update available" even right after brew finishes upgrading.
  //
  // When the latest source has no separate build and the installed build is a
  // *refinement* of the version (i.e. starts with cur.version), the build is
  // the more precise installed identifier — compare against it too. If the
  // build is already >= the latest version, there's nothing to do.
  if (
    !lat.build &&
    cur.build &&
    cur.build !== cur.version &&
    cur.build.startsWith(cur.version.split(/[^\d.]/)[0])
  ) {
    if (compareVersion(lat.version, cur.build) <= 0) return false;
  }

  // Otherwise compare version strings
  return compareVersion(lat.version, cur.version) > 0;
}

export function shortenVersion(v: string, max = 14): string {
  if (!v) return "";
  if (v.length <= max) return v;
  return v.slice(0, max - 1) + "…";
}
