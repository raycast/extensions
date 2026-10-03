export type MacExecutionTarget =
  | { kind: "desktop"; bundleId: string }
  | { kind: "browser"; bundleId: string; hostname: string; url: string };
export type WindowsExecutionTarget =
  | { kind: "desktop"; windowsProcessName: string; processId?: number; windowHandle?: string }
  | {
      kind: "browser";
      windowsProcessName: string;
      processId: number;
      windowHandle: string;
      addressValue: string;
      documentUrl: string;
      hostname: string;
      url: string;
    };
export type ExecutionTarget = MacExecutionTarget | WindowsExecutionTarget;
export const windowsBrowsers = ["chrome", "msedge", "brave", "vivaldi", "opera", "firefox", "chromium"];
export const chromiumBundles = [
  "com.google.Chrome",
  "com.google.Chrome.beta",
  "com.google.Chrome.canary",
  "com.vivaldi.Vivaldi",
  "com.brave.Browser",
  "com.microsoft.edgemac",
  "com.operasoftware.Opera",
  "org.chromium.Chromium",
];
export const safariBundles = ["com.apple.Safari", "com.apple.SafariTechPreview"];
export function validateTarget(target: ExecutionTarget): void {
  if ("windowsProcessName" in target) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,99}$/.test(target.windowsProcessName) ||
      target.windowsProcessName.includes("..") ||
      /\.exe$/i.test(target.windowsProcessName)
    )
      throw new Error("Application target is unavailable");
    if (target.processId !== undefined || target.windowHandle !== undefined || target.kind === "browser") {
      if (
        !Number.isSafeInteger(target.processId) ||
        target.processId! <= 0 ||
        !/^[1-9][0-9]{0,18}$/.test(target.windowHandle ?? "")
      )
        throw new Error("Application target is unavailable");
    }
    if (target.kind === "browser") {
      if (!windowsBrowsers.includes(target.windowsProcessName.toLowerCase())) throw new Error("Browser is unsupported");
      const address = target.addressValue;
      if (!address || /\s/.test(address)) throw new Error("Web page target changed");
      const captured = new URL(/^https?:\/\//i.test(address) ? address : `${new URL(target.url).protocol}//${address}`);
      // Native UIA corroborates address/document equivalence using Windows URI rules.
      // Keep their raw values for rechecks; WHATWG URL escaping is not equivalent.
      if (
        !["https:", "http:"].includes(captured.protocol) ||
        captured.username ||
        captured.password ||
        new URL(target.documentUrl).href !== target.url
      )
        throw new Error("Web page target changed");
      const url = new URL(target.url);
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.hostname !== target.hostname ||
        url.username ||
        url.password
      )
        throw new Error("Web page target changed");
    }
    return;
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]+$/.test(target.bundleId)) throw new Error("Application target is unavailable");
  if (target.kind === "browser") {
    if (![...chromiumBundles, ...safariBundles, "company.thebrowser.Browser"].includes(target.bundleId))
      throw new Error("Browser is unsupported");
    const url = new URL(target.url);
    if (!["https:", "http:"].includes(url.protocol) || url.hostname !== target.hostname)
      throw new Error("Web page target changed");
  }
}
export function parseDelay(value: string | number): number {
  const delay = Number(value);
  if (!Number.isFinite(delay) || delay < 0 || delay > 5) throw new Error("Delay must be between 0 and 5 seconds");
  return delay;
}
