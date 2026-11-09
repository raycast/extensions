/**
 * Manager handoff policy.
 *
 * Opening the manager is an explicit action, so it has no preference
 * gate: the user already expressed intent. The only hard limit is the browser
 * ME is bound to. Chrome and Edge accept the extension URL on the command line;
 * Arc discards it, and macOS refuses `chrome-extension://` through LaunchServices
 * and AppleScript. The helper is asked for the bound target first, so an
 * unsupported browser is reported before any request is created.
 */
export type ManagerTarget = { browser?: string; extensionId?: string };
export type ManagerAvailability = "ready" | "unbound" | "unsupported";

export function managerAvailability(target?: ManagerTarget): ManagerAvailability {
  if (!target?.browser || !/^[a-p]{32}$/.test(target.extensionId ?? "")) return "unbound";
  return target.browser === "chrome" || target.browser === "edge" ? "ready" : "unsupported";
}

export function managerNotice(
  availability: ManagerAvailability,
  browser?: string,
): { title: string; message: string } {
  switch (availability) {
    case "unbound":
      return {
        title: "Manager Browser Not Set",
        message: "Bind Chrome or Edge as ME's manager browser in the main app first.",
      };
    case "unsupported":
      return {
        title: browser === "arc" ? "Arc Can't Open the Manager" : "Manager Browser Not Supported",
        message:
          browser === "arc"
            ? "Arc ignores extension pages opened by other apps. Open the bookmark library from the ME popup in Arc, or bind Chrome or Edge as the manager browser."
            : "Set ME's manager browser to Chrome or Edge to open the manager page.",
      };
    default:
      return { title: "Opening ME Manager", message: "" };
  }
}
