import type { LaunchOptionsValues } from "./schema";

export function summarizeValues(values: LaunchOptionsValues): string {
  const parts: string[] = [];

  if (values.browsingMode === "incognito") parts.push("Incognito");
  if (values.appMode && values.startUrl.trim()) parts.push("app mode");
  if (values.startUrl.trim()) parts.push(values.startUrl.trim());

  if (values.windowState !== "normal") parts.push(values.windowState);
  if (values.windowSize.trim()) parts.push(values.windowSize.trim());
  if (values.windowPosition.trim()) parts.push(`@${values.windowPosition.trim()}`);

  if (values.disableWebSecurity) parts.push("no-web-sec");
  if (values.disableExtensions) parts.push("no-ext");
  if (values.autoOpenDevtools) parts.push("devtools");
  if (values.remoteDebuggingPort.trim()) parts.push(`CDP:${values.remoteDebuggingPort.trim()}`);

  if (values.userAgent.trim()) parts.push("UA-override");
  if (values.proxyServer.trim()) parts.push(`proxy ${values.proxyServer.trim()}`);
  if (values.ignoreCertificateErrors) parts.push("ignore-certs");
  if (values.language.trim()) parts.push(`lang:${values.language.trim()}`);

  if (values.customArgs.trim()) parts.push("+custom");

  if (parts.length === 0) return "Default launch";
  return parts.join(" · ");
}
