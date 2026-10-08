import { runAppleScript } from "@raycast/utils";
import { exec } from "child_process";
import { promisify } from "util";
import { Image, environment } from "@raycast/api";

const execAsync = promisify(exec);

type NotificationOptions = {
  title: string;
  message: string;
  icon?: Image.ImageLike;
  url?: string;
};

const PATH = [
  ".",
  "/bin",
  "/usr/bin",
  "/usr/gnu/bin",
  "/usr/local/bin",
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
].join(":");

function shellEscape(str: string) {
  return `'${str.replace(/'/g, `'\\''`)}'`;
}
function appleScriptEscape(str: string) {
  return str.replace(/"/g, '\\"');
}
function isImage(obj: unknown): obj is Image {
  return typeof obj === "object" && obj !== null && "source" in obj;
}
function extractUrlFromImageLike(favicon?: Image.ImageLike) {
  if (typeof favicon === "string") return favicon;
  if (favicon instanceof URL) return favicon.toString();
  if (isImage(favicon)) {
    const src = favicon.source;
    if (typeof src === "string") return src;
    if (src instanceof URL) return src.toString();
    if (typeof src === "object" && src !== null && "light" in src && src.light) {
      // Return light or dark depending on user env
      return environment.appearance === "dark" ? src.dark : src.light;
    }
  }
  return undefined;
}

export async function showNotification({ title, message, icon, url }: NotificationOptions) {
  try {
    const image = extractUrlFromImageLike(icon);
    const args = ["-title", shellEscape(title), "-message", shellEscape(message)];
    if (image) args.push("-contentImage", shellEscape(image));
    if (url) args.push("-open", shellEscape(url));

    await execAsync(`terminal-notifier ${args.join(" ")}`, { env: { ...process.env, PATH } });
  } catch {
    await runAppleScript(`
      display notification "${appleScriptEscape(message)}" with title "${appleScriptEscape(title)}"
    `);
  }
}
