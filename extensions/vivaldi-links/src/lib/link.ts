import { pathToFileURL } from "url";

export type Link = {
  /** Absolute, ready-to-launch URL. */
  url: string;
  /** What the user sees as the title of the row. */
  title: string;
  /** What the user sees underneath, when it adds anything to the title. */
  subtitle?: string;
  /** How the raw text was read, so the UI can say what it assumed. */
  kind: "as-typed" | "assumed-https" | "assumed-http" | "local-file";
};

/**
 * Schemes handed straight to Vivaldi. `javascript:`, `data:` and `vbscript:` are absent on
 * purpose: pasting one of those into a browser runs it inside whatever page is open, which
 * is the classic self-inflicted script injection.
 */
const ALLOWED_SCHEMES = new Set([
  "http",
  "https",
  "ftp",
  "ftps",
  "file",
  "mailto",
  "magnet",
  "tel",
  "chrome",
  "vivaldi",
  "about",
  "view-source",
  "webcal",
]);

const SCHEME = /^([a-z][a-z0-9+.-]*):/i;

// A hostname with at least one dot and a letters-only last label, optional port, and
// optional path/query/fragment. Unicode letters are allowed so `pratíca.com.br` matches.
const HOSTNAME = /^(?:[\p{L}\p{N}_-]+\.)+\p{L}{2,}(?::\d{1,5})?(?:[/?#][^\s]*)?$/u;

// Hosts that only ever answer on plain HTTP in practice: the loopback names and bare IPv4.
const LOCAL_HOST =
  /^(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|(?:\d{1,3}\.){3}\d{1,3})(?::\d{1,5})?(?:[/?#][^\s]*)?$/i;

const WINDOWS_PATH = /^(?:[a-z]:[\\/]|\\\\[^\\/]+[\\/])/i;

const MARKDOWN_LINK = /\[[^\]]*\]\(\s*([^\s)]+)[^)]*\)/;

/** Strips the packaging text pasted around links: angle brackets, quotes, markdown, wrapping. */
function unwrap(rawText: string) {
  let text = rawText.trim();

  const markdown = text.match(MARKDOWN_LINK);

  if (markdown) {
    text = markdown[1];
  }

  // Angle brackets and quotes come from mail clients and chat apps.
  text = text.replace(/^[<("'`]+/, "").replace(/[>)"'`]+$/, "");

  // A link that survived a line wrap arrives split across lines. Rejoining is only safe
  // when what is left has no inner spaces — otherwise this is prose, not a link.
  if (/\s/.test(text)) {
    const joined = text.replace(/[\r\n\t]+/g, "").trim();
    text = /\s/.test(joined) ? text : joined;
  }

  // Trailing sentence marks belong to the sentence the link was quoted in, not to the link.
  const withoutPunctuation = text.replace(/[.,;:!?]+$/, "");

  return withoutPunctuation || text;
}

/**
 * Extensions that make a bare `name.ext` a file the user meant to find, not a hostname —
 * without this, typing `notas.txt` would open `https://notas.txt`. Real TLDs that double as
 * extensions (`.sh`, `.zip`, `.mov`, `.dev`) are deliberately absent: with those, a bare
 * name is far more likely to be a domain.
 */
// prettier-ignore
const FILE_EXTENSIONS = new Set([
  "txt", "pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "csv", "tsv",
  "xls", "xlsx", "doc", "docx", "ppt", "pptx", "odt", "rtf", "exe", "msi", "dll", "bat",
  "ps1", "log", "json", "yml", "yaml", "toml", "ini", "conf", "cfg", "env", "md", "ts",
  "tsx", "js", "jsx", "py", "rs", "go", "java", "cs", "cpp", "sql", "db", "sqlite", "bak",
  "tmp", "rar", "7z", "tar", "gz", "iso", "mp3", "mp4", "mkv", "avi", "wav", "psd", "ai",
]);

/** True for `relatorio.pdf` but not for `relatorio.pdf/x`, `stripe.com` or `vercel.app`. */
function looksLikeBareFilename(text: string) {
  if (/[/?#:]/.test(text)) {
    return false;
  }

  const extension = text.split(".").pop()?.toLowerCase();

  return Boolean(extension && FILE_EXTENSIONS.has(extension));
}

function finalize(url: string, kind: Link["kind"]): Link | undefined {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const scheme = parsed.protocol.replace(/:$/, "").toLowerCase();

  if (!ALLOWED_SCHEMES.has(scheme)) {
    return undefined;
  }

  // `https://` alone parses fine and goes nowhere.
  if ((scheme === "http" || scheme === "https" || scheme === "ftp" || scheme === "ftps") && !parsed.hostname) {
    return undefined;
  }

  const rest = `${parsed.pathname === "/" ? "" : parsed.pathname}${parsed.search}${parsed.hash}`;

  if (scheme === "file") {
    return {
      url: parsed.href,
      title: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
      kind,
    };
  }

  if (!parsed.hostname) {
    return { url: parsed.href, title: parsed.href, kind };
  }

  return {
    url: parsed.href,
    title: parsed.hostname.replace(/^www\./i, ""),
    subtitle: rest || undefined,
    kind,
  };
}

/**
 * Reads whatever the user typed, pasted or copied as a launchable URL, or returns undefined
 * when it is not a link. Nothing here guesses a search query: a non-link stays a non-link.
 */
export function parseLink(rawText: string): Link | undefined {
  const text = unwrap(rawText ?? "");

  if (!text) {
    return undefined;
  }

  if (WINDOWS_PATH.test(text)) {
    return finalize(pathToFileURL(text).href, "local-file");
  }

  // `localhost:3000` and `stripe.com:8080` look exactly like a scheme to a naive regex, so a
  // scheme only counts when it is one we know or when the `://` separator is actually there.
  const scheme = text.match(SCHEME)?.[1]?.toLowerCase();

  if (scheme && (ALLOWED_SCHEMES.has(scheme) || text.includes("://"))) {
    return finalize(text, "as-typed");
  }

  if (LOCAL_HOST.test(text)) {
    return finalize(`http://${text}`, "assumed-http");
  }

  if (HOSTNAME.test(text) && !looksLikeBareFilename(text)) {
    return finalize(`https://${text}`, "assumed-https");
  }

  return undefined;
}
