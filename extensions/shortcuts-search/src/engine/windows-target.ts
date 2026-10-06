import { runPowerShellScript } from "@raycast/utils";
import { decodePowerShellJson, windowsNativeScript, powerShellProgram } from "./windows-native";
import type { ExecutionTarget, WindowsExecutionTarget } from "./execution-target";
import { validateTarget, windowsBrowsers } from "./execution-target";

export function normalizeBrowserUrl(value: string): string {
  if (!value || /\s/.test(value) || (!/^https?:\/\//i.test(value) && !/^[a-zA-Z0-9-]+\./.test(value)))
    throw new Error("Could not verify the browser address bar");
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Web page is unsupported");
  return url.href;
}

export function buildWindowsCaptureScript(processName: string, browser = false): string {
  validateTarget({ kind: "desktop", windowsProcessName: processName });
  if (browser && !windowsBrowsers.includes(processName.toLowerCase())) throw new Error("Browser is unsupported");
  return powerShellProgram(`${windowsNativeScript}
${decodePowerShellJson("request", { processName, browser })}
$handle = Get-HotkysWindow $request.processName
$owner = [uint32]0
[void][HotkysWindows]::GetWindowThreadProcessId($handle, [ref]$owner)
$result = @{ windowsProcessName = $request.processName; processId = [int]$owner; windowHandle = $handle.ToInt64().ToString() }
if ($request.browser) { $page = Get-HotkysBrowserUrl $handle; $result.url = $page.url; $result.addressValue = $page.addressValue }
$result | ConvertTo-Json -Compress`);
}

export function parseWindowsTarget(result: string, processName: string, browser = false): WindowsExecutionTarget {
  const parsed = JSON.parse(result) as Record<string, unknown>;
  if (
    parsed.windowsProcessName !== processName ||
    typeof parsed.processId !== "number" ||
    typeof parsed.windowHandle !== "string"
  )
    throw new Error("Application target is unavailable");
  const window = { windowsProcessName: processName, processId: parsed.processId, windowHandle: parsed.windowHandle };
  const url = browser && typeof parsed.url === "string" ? normalizeBrowserUrl(parsed.url) : undefined;
  if (browser && !url) throw new Error("Could not verify the browser address bar");
  const target: WindowsExecutionTarget = url
    ? {
        kind: "browser",
        ...window,
        addressValue: parsed.addressValue as string,
        documentUrl: parsed.url as string,
        url,
        hostname: new URL(url).hostname,
      }
    : { kind: "desktop", ...window };
  validateTarget(target);
  return target;
}

export async function captureWindowsTarget(processName: string, browser = false): Promise<ExecutionTarget> {
  const result = await runPowerShellScript(buildWindowsCaptureScript(processName, browser), { timeout: 15000 });
  return parseWindowsTarget(result, processName, browser);
}
