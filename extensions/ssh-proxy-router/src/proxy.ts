import { getPreferenceValues } from "@raycast/api";
import { createProxyController, parsePreferences } from "./proxy-core";
import { writeSnapshot } from "./diagnostic-snapshot";
export type { ProxyStatus, RoutedWebsite } from "./proxy-core";

function controller() {
  return createProxyController(parsePreferences(getPreferenceValues<Preferences>()));
}
async function saveActiveSettings(proxy: ReturnType<typeof controller>) {
  try {
    await writeSnapshot(await proxy.diagnosticConfig());
  } catch (error) {
    console.warn("Could not save diagnostic settings:", error);
  }
}
export function getPrimaryURL() {
  return controller().getPrimaryURL();
}
export function getRoutedWebsites() {
  return controller().getRoutedWebsites();
}
export function shouldOpenInSafari() {
  return getPreferenceValues<Preferences>().openInSafari;
}
export async function getProxyStatus() {
  const proxy = controller();
  const status = await proxy.getProxyStatus();
  if (status.running) await saveActiveSettings(proxy);
  return status;
}
export async function startProxy() {
  const proxy = controller();
  const message = await proxy.startProxy();
  await saveActiveSettings(proxy);
  return message;
}
export async function stopProxy() {
  return controller().stopProxy();
}
export async function toggleProxy() {
  const proxy = controller();
  const result = await proxy.toggleProxy();
  if (result.running) await saveActiveSettings(proxy);
  return result;
}
export async function testProxy(): Promise<string> {
  const report = await controller().runDiagnostics();
  if (!report.passed)
    throw new Error(
      report.checks
        .filter((check) => check.status === "fail")
        .map((check) => `${check.name}: ${check.detail}`)
        .join("; "),
    );
  return `${report.checks.filter((check) => check.name.startsWith("Website:")).length} websites responded through SSH; PAC and macOS routing checks passed.`;
}
