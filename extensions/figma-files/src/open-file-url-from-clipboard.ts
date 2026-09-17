import { Clipboard, getApplications, open, showToast, Toast } from "@raycast/api";

function isValidFigmaFileUrl(text: string): boolean {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }

  const validHosts = ["figma.com", "www.figma.com"];
  const validPathPrefixes = ["/file/", "/design/", "/proto/", "/board/", "/slides/", "/deck/"];

  return validHosts.includes(url.hostname) && validPathPrefixes.some((prefix) => url.pathname.startsWith(prefix));
}

export default async function Command() {
  const text = (await Clipboard.readText())?.trim();

  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard is empty" });
    return;
  }

  if (!isValidFigmaFileUrl(text)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not a valid Figma file URL",
      message: text.length > 100 ? `${text.slice(0, 100)}…` : text,
    });
    return;
  }

  const apps = await getApplications();
  // bundleId is macOS-only; fall back to matching by name on Windows
  const desktopApp = apps.find((app) =>
    process.platform === "win32" ? app.name === "Figma" : app.bundleId === "com.figma.Desktop",
  );

  if (desktopApp) {
    // The desktop app deep-links https://figma.com URLs into the right file
    await open(text, desktopApp);
  } else {
    await open(text);
  }
}
