import { execFile } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  swissPath?: string;
  passwordLength?: string;
}

const CANDIDATES = ["/opt/homebrew/bin/swiss", "/usr/local/bin/swiss", "/usr/bin/swiss"];

/** Resolve the swiss binary: preference first, then common install paths, then PATH. */
export function swissBinary(): string {
  const pref = getPreferenceValues<Preferences>().swissPath?.trim();
  if (pref) return pref;
  for (const c of CANDIDATES) {
    if (existsSync(c)) return c;
  }
  return "swiss";
}

export function passwordLength(): number {
  const raw = getPreferenceValues<Preferences>().passwordLength?.trim();
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 20;
}

// swiss highlights structured output with ANSI escape codes; strip them for the UI.
// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;

/**
 * Run a swiss subcommand. When `input` is provided it is piped to stdin, so the
 * command's value flag must be set to "-" (e.g. ["json", "toYAML", "-v", "-"]).
 */
export function runSwiss(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      swissBinary(),
      args,
      { maxBuffer: 16 * 1024 * 1024, timeout: 10_000 },
      (err, stdout, stderr) => {
        if (err) {
          const msg = (stderr || err.message || "swiss failed").replace(ANSI, "").trim();
          reject(new Error(msg));
          return;
        }
        resolve(stdout.replace(ANSI, ""));
      },
    );
    if (input !== undefined && child.stdin) {
      child.stdin.on("error", () => {
        /* ignore EPIPE if the process exits early */
      });
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/** Check whether the swiss CLI can actually be executed. */
export function isSwissInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(swissBinary(), ["--help"], { timeout: 5_000 }, (err) => {
      resolve(!(err && (err as NodeJS.ErrnoException).code === "ENOENT"));
    });
  });
}

export interface Transform {
  id: string;
  title: string;
  group: string;
  /** Full swiss args with the value flag set to "-" so input is read from stdin. */
  args: string[];
}

/** The pretty shell command shown to the user (input is piped in). */
export function shellCommand(t: Transform): string {
  return `swiss ${t.args.join(" ")}`;
}

export const TRANSFORMS: Transform[] = [
  // Encoding
  { id: "b64enc", title: "Base64 Encode", group: "Encoding", args: ["base64", "encode", "-v", "-"] },
  { id: "b64dec", title: "Base64 Decode", group: "Encoding", args: ["base64", "decode", "-v", "-"] },
  { id: "b58enc", title: "Base58 Encode", group: "Encoding", args: ["base58", "encode", "-v", "-"] },
  { id: "b58dec", title: "Base58 Decode", group: "Encoding", args: ["base58", "decode", "-v", "-"] },
  { id: "hexenc", title: "Hex Encode", group: "Encoding", args: ["hex", "encode", "-v", "-"] },
  { id: "hexdec", title: "Hex Decode", group: "Encoding", args: ["hex", "decode", "-v", "-"] },
  { id: "urlenc", title: "URL Encode", group: "Encoding", args: ["url", "encode", "--url", "-"] },
  { id: "urldec", title: "URL Decode", group: "Encoding", args: ["url", "decode", "--url", "-"] },
  { id: "gzipc", title: "Gzip Compress", group: "Encoding", args: ["gzip", "compress", "-v", "-"] },
  { id: "gzipd", title: "Gzip Decompress", group: "Encoding", args: ["gzip", "decompress", "-v", "-"] },
  { id: "htmlesc", title: "HTML Escape", group: "Encoding", args: ["html", "escape", "-v", "-"] },
  { id: "htmlunesc", title: "HTML Unescape", group: "Encoding", args: ["html", "unescape", "-v", "-"] },

  // Hashing
  { id: "md5", title: "MD5", group: "Hashing", args: ["hash", "md5", "-v", "-"] },
  { id: "sha1", title: "SHA-1", group: "Hashing", args: ["hash", "sha1", "-v", "-"] },
  { id: "sha256", title: "SHA-256", group: "Hashing", args: ["hash", "sha256", "-v", "-"] },
  { id: "sha512", title: "SHA-512", group: "Hashing", args: ["hash", "sha512", "-v", "-"] },
  { id: "bcrypt", title: "Bcrypt Hash", group: "Hashing", args: ["bcrypt", "hash", "-v", "-"] },

  // Data
  { id: "jsonbeautify", title: "JSON Beautify", group: "Data", args: ["json", "beautify", "-v", "-"] },
  { id: "jsonyaml", title: "JSON → YAML", group: "Data", args: ["json", "toYAML", "-v", "-"] },
  { id: "jsonxml", title: "JSON → XML", group: "Data", args: ["json", "toXML", "-v", "-"] },
  { id: "jsongo", title: "JSON → Go struct", group: "Data", args: ["json", "toGoStruct", "-v", "-"] },
  { id: "jsonesc", title: "JSON Escape", group: "Data", args: ["json", "escape", "-v", "-"] },
  { id: "yamljson", title: "YAML → JSON", group: "Data", args: ["yaml", "toJson", "-v", "-"] },
  { id: "xmljson", title: "XML → JSON", group: "Data", args: ["xml", "toJSON", "-v", "-"] },

  // Crypto
  { id: "jwt", title: "JWT Decode", group: "Crypto", args: ["jwt", "decode", "-v", "-"] },

  // Text
  { id: "slug", title: "Slugify", group: "Text", args: ["slug", "-v", "-"] },
  { id: "snake", title: "snake_case", group: "Text", args: ["case", "snake", "-v", "-"] },
  { id: "camel", title: "camelCase", group: "Text", args: ["case", "camel", "-v", "-"] },
  { id: "kebab", title: "kebab-case", group: "Text", args: ["case", "kebab", "-v", "-"] },
  { id: "pascal", title: "PascalCase", group: "Text", args: ["case", "pascal", "-v", "-"] },
  { id: "count", title: "Text Count", group: "Text", args: ["text", "count", "-v", "-"] },

  // Network
  { id: "iptoint", title: "IP → Int", group: "Network", args: ["ip", "toInt", "-v", "-"] },
  { id: "ipfromint", title: "Int → IP", group: "Network", args: ["ip", "fromInt", "-v", "-"] },
  { id: "ipcidr", title: "CIDR Info", group: "Network", args: ["ip", "cidr", "-v", "-"] },

  // Misc
  { id: "colorrgb", title: "Color → RGB", group: "Misc", args: ["color", "toRGB", "-v", "-"] },
  { id: "colorhsl", title: "Color → HSL", group: "Misc", args: ["color", "toHSL", "-v", "-"] },
  { id: "cron", title: "Cron Explain", group: "Misc", args: ["cron", "explain", "-v", "-"] },
  { id: "tounix", title: "Date → Unix", group: "Misc", args: ["time", "toUnix", "-v", "-"] },
  { id: "fromunix", title: "Unix → Date", group: "Misc", args: ["time", "fromUnix", "-v", "-"] },
];
