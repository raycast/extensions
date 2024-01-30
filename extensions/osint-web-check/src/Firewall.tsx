import got from "got";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { lowerCaseKeys } from "./utils/lowerCaseKeys";
import { WebCheckComponentProps } from "./utils/types";
import { useCheckDetail } from "./utils/useCheckDetail";

export function Firewall({ url, enabled }: WebCheckComponentProps) {
  const { data, isLoading } = useCheckDetail({ keyPrefix: "firewall", enabled, url, fetcher: isFirewallEnabled });

  const content = data ? `## Firewall ${data.enabled ? "Enabled" : "Not Detected"}\n ${data.reason}` : "";

  return (
    <List.Item
      title="Firewall Enabled"
      actions={
        <ActionPanel>
          <Action.Push title="More Info" target={<Detail markdown={INFO} />} />
        </ActionPanel>
      }
      detail={<List.Item.Detail isLoading={isLoading} markdown={content} />}
    />
  );
}

async function isFirewallEnabled(url: string): Promise<{ enabled: boolean; name?: string; reason?: string }> {
  const headers = await got(url).then((res) => lowerCaseKeys(res.headers));

  for (const [headerName, headerCheck, wafName] of headerChecks) {
    const headerValue = headers[headerName];
    if (!headerValue) continue;

    if (headerValue && new RegExp(headerCheck, "i").test(String(headerValue))) {
      return {
        enabled: true,
        name: wafName,
        reason: `Value of "${headerValue}" found for "${headerName}" HTTP header.`,
      };
    }
  }

  return { enabled: false, reason: "No firewall detected using HTTP response headers." };
}

// Based on this: https://github.com/Lissy93/web-check/blob/e44f8e73aa61558519e4a5fc849aec7d94752366/api/firewall.js#L18
const headerChecks: [string, string, string][] = [
  ["server", "cloudflare", "Cloudflare"],
  ["x-powered-by", "AWS Lambda", "AWS WAF"],
  ["server", "Akamai Ghost", "Akamai"],
  ["server", "Sucuri", "Sucuri"],
  ["server", "BarracudaWAF", "Barracuda WAF"],
  ["server", "BIG-IP", "F5 BIG-IP"],
  ["server", "F5 BIG-IP", "F5 BIG-IP"],
  ["x-sucuri-id", ".*", "Sucuri CloudProxy WAF"],
  ["x-sucuri-cache", ".*", "Sucuri CloudProxy WAF"],
  ["server", "FortiWeb", "Fortinet FortiWeb WAF"],
  ["server", "Imperva", "Imperva SecureSphere WAF"],
  ["x-protected-by", "Sqreen", "Sqreen"],
  ["x-waf-event-info", ".*", "Reblaze WAF"],
  ["set-cookie", "_citrix_ns_id", "Citrix NetScaler"],
  ["x-denied-reason", ".*", "WangZhanBao WAF"],
  ["x-wzws-requested-method", ".*", "WangZhanBao WAF"],
  ["x-webcoment", ".*", "Webcoment Firewall"],
  ["server", "Yundun", "Yundun WAF"],
  ["x-yd-waf-info", ".*", "Yundun WAF"],
  ["x-yd-info", ".*", "Yundun WAF"],
  ["server", "Safe3WAF", "Safe3 Web Application Firewall"],
  ["server", "NAXSI", "NAXSI WAF"],
  ["x-datapower-transactionid", ".*", "IBM WebSphere DataPower"],
  ["server", "Vercel", "Vercel"],
];

const INFO = `
## Web Application Firewall (WAF)

A Web Application Firewall (WAF) is a security technology that protects web applications from various types of cyber attacks, such as SQL injection and cross-site scripting. It analyzes and filters incoming HTTP/HTTPS traffic to identify and block malicious requests, keeping web applications secure and preventing unauthorized access.

HTTP response headers can often be used to determine the presences of a WAF, which is the technique used by this tool.
`.trim();
