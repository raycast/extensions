import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { runRemote } from "../lib/ssh";
import { fetchIp, parseSshJson, mdCode, parseErrorMessage } from "../lib/utils";

type IpData = { lan: string; wan: string; vpn: string; debugLog: string };

async function loadIpData(): Promise<IpData> {
  const vpnPromise = fetchIp("http://2ip.io").then((res) => res || fetchIp("https://2ip.io"));
  const sshPromise = runRemote(
    `
    LAN=$(ip -4 addr show br0 | grep -oE 'inet [0-9.]+' | head -n 1 | awk '{print $2}' | cut -d/ -f1)
    WAN_RAW=$(wget -qO- https://2ip.ru 2>/dev/null || curl -fsS https://2ip.ru 2>/dev/null)
    WAN=$(echo "$WAN_RAW" | grep -oE '([0-9]{1,3}\\.){3}[0-9]{1,3}' | head -n 1)
    [ -z "$WAN" ] && WAN="Check Failed"
    echo "___JSON_START___"
    printf '{"lan":"%s","wan":"%s"}' "$LAN" "$WAN"
    echo ""
    echo "___JSON_END___"
    `,
  );

  const [vpnResult, sshResult] = await Promise.all([vpnPromise, sshPromise]);
  const routerData = parseSshJson(sshResult.stdout);

  return {
    lan: routerData?.lan || "Unknown",
    wan: routerData?.wan || "Unknown",
    vpn: vpnResult || "Fetch Failed",
    debugLog: sshResult.stdout,
  };
}

function isVpnConnectionActive(data: IpData | undefined): boolean {
  if (!data || !data.vpn || !data.wan) return false;
  if (data.vpn === data.wan) return false;
  if (data.vpn.includes("Failed") || data.wan.includes("Failed")) return false;
  return true;
}

export function IpDetail() {
  const { data, isLoading, error, revalidate } = usePromise(loadIpData);

  const debugLog = data?.debugLog ?? "";
  const lan = data?.lan || "—";
  const wan = data?.wan || "—";
  const vpn = data?.vpn || "—";

  const isVpnActive = isVpnConnectionActive(data);

  const md = error ? mdCode("Network Status", parseErrorMessage(error)) : ["# Network Status", ""].join("\n");

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      metadata={
        error ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Exit IP"
              text={`${vpn} (${isVpnActive ? "✅ VPN Active" : "⚠️ Direct/Bypass"})`}
            />
            <Detail.Metadata.Label title="Direct IP" text={wan} />
            <Detail.Metadata.Label title="Router LAN" text={lan} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Note"
              text="Exit IP from 2ip.io (via device). Direct IP from 2ip.ru (via router)."
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
          {error && <Action.CopyToClipboard title="Copy Error" content={parseErrorMessage(error)} />}
          <Action.Push title="Debug Log" target={<Detail markdown={mdCode("SSH Output", debugLog)} />} />
        </ActionPanel>
      }
    />
  );
}
