import { Icon } from "@raycast/api";
import { analyzeCidr, ipToBinary, ipToLong, isPrivateIp, longToIp } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="IPv4 / CIDR / Integer"
      placeholder="192.168.1.10 or 192.168.1.0/24 or 3232235786"
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        const rows: ResultRow[] = [];

        if (/^\d+$/.test(input)) {
          // An all-digit input is an integer, not a dotted quad. Keep this branch exclusive so
          // the IP parsing below does not also run and add a bogus "Invalid IP address" row.
          const ip = longToIp(Number(input) >>> 0);
          rows.push({ id: "ip", title: ip, subtitle: "Integer to IP", icon: Icon.Globe, copyValue: ip });
        } else if (input.includes("/")) {
          try {
            const info = analyzeCidr(input);
            const entries: Array<[string, string]> = [
              ["Network Address", info.network],
              ["Broadcast Address", info.broadcast],
              ["Netmask", info.netmask],
              ["Wildcard Mask", info.wildcard],
              ["Usable Range", `${info.firstHost} - ${info.lastHost}`],
              ["Usable Hosts", String(info.usableHosts)],
              ["Total Addresses", String(info.totalHosts)],
            ];
            entries.forEach(([label, value]) =>
              rows.push({ id: label, title: value, subtitle: label, icon: Icon.Network, copyValue: value }),
            );
          } catch (error) {
            rows.push({
              id: "cidr-error",
              title: "Invalid CIDR",
              detail: (error as Error).message,
              icon: Icon.CircleDisabled,
              copyValue: (error as Error).message,
            });
          }
        } else {
          try {
            const long = ipToLong(input);
            rows.push({
              id: "long",
              title: String(long),
              subtitle: "IP to Integer",
              icon: Icon.Number00,
              copyValue: String(long),
            });
            rows.push({
              id: "binary",
              title: ipToBinary(input),
              subtitle: "Binary",
              icon: Icon.Hashtag,
              copyValue: ipToBinary(input),
            });
            rows.push({
              id: "hex",
              title: `0x${long.toString(16).toUpperCase()}`,
              subtitle: "Hexadecimal",
              icon: Icon.Hashtag,
            });
            rows.push({
              id: "private",
              title: isPrivateIp(input) ? "Private / Reserved" : "Public",
              subtitle: "Address Type",
              icon: Icon.CircleDisabled,
            });
            rows.push({
              id: "default-cidr",
              title: `${input}/24`,
              subtitle: "As /24 (for reference)",
              icon: Icon.Network,
            });
          } catch (error) {
            rows.push({
              id: "ip-error",
              title: "Invalid IP address",
              detail: (error as Error).message,
              icon: Icon.CircleDisabled,
              copyValue: (error as Error).message,
            });
          }
        }
        return rows;
      }}
    />
  );
}
