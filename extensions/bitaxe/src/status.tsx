import { Detail, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

interface SystemInfo {
  [key: string]: unknown;
}

export default function Command() {
  const { bitaxeIps } = getPreferenceValues<{ bitaxeIps: string }>();
  const ipList =
    bitaxeIps
      ?.split(",")
      .map((ip) => ip.trim())
      .filter(Boolean) || [];

  const [infoMap, setInfoMap] = useState<Record<string, SystemInfo | null>>(() =>
    Object.fromEntries(ipList.map((ip) => [ip, null])),
  );
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ipList.map((ip) => [ip, true])),
  );
  const [errorMap, setErrorMap] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(ipList.map((ip) => [ip, null])),
  );

  useEffect(() => {
    setInfoMap(Object.fromEntries(ipList.map((ip) => [ip, null])));
    setLoadingMap(Object.fromEntries(ipList.map((ip) => [ip, true])));
    setErrorMap(Object.fromEntries(ipList.map((ip) => [ip, null])));
    ipList.forEach((ip) => {
      fetchInfo(ip);
    });
    async function fetchInfo(ip: string) {
      setLoadingMap((prev) => ({ ...prev, [ip]: true }));
      setErrorMap((prev) => ({ ...prev, [ip]: null }));
      try {
        const res = await fetch(`http://${ip}/api/system/info`);
        if (!res.ok) {
          setErrorMap((prev) => ({ ...prev, [ip]: `HTTP ${res.status}` }));
          setInfoMap((prev) => ({ ...prev, [ip]: null }));
          return;
        }
        const data = (await res.json()) as SystemInfo;
        setInfoMap((prev) => ({ ...prev, [ip]: data }));
      } catch (e) {
        setInfoMap((prev) => ({ ...prev, [ip]: null }));
        setErrorMap((prev) => ({ ...prev, [ip]: e instanceof Error ? e.message : "Unknown error" }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [ip]: false }));
      }
    }
  }, [bitaxeIps]);

  if (ipList.length === 0) {
    return (
      <Detail
        isLoading={false}
        markdown={"No IPs Configured. Please configure at least one BitAxe IP address in the extension preferences."}
      />
    );
  }

  if (ipList.every((ip) => errorMap[ip])) {
    const firstIp = ipList[0];
    let errorMessage = errorMap[firstIp] || "Unknown error";
    if (errorMessage.toLowerCase().includes("fetch failed") || errorMessage.toLowerCase().includes("networkerror")) {
      errorMessage = `Unable to connect to BitAxe at ${firstIp}. Please check that the device is online and accessible on your network.`;
    }
    return <Detail isLoading={false} markdown={`Error: ${errorMessage}`} />;
  }

  const allFields = [
    { label: "Device Link", key: "deviceLink" },
    { label: "Hostname", key: "hostname" },
    { label: "Hashrate", key: "hashRate" },
    { label: "Voltage", key: "voltage" },
    { label: "Current", key: "current" },
    { label: "Temperature", key: "temp" },
    { label: "VR Temperature", key: "vrTemp" },
    { label: "Frequency", key: "frequency" },
    { label: "Fan RPM", key: "fanrpm" },
    { label: "SSID", key: "ssid" },
    { label: "Status", key: "wifiStatus" },
    { label: "RSSI", key: "wifiRSSI" },
    { label: "MAC Address", key: "macAddr" },
  ];

  /**
   * Helper to divide a value by 1000 and round to two decimals.
   */
  function divideAndRound(val: unknown) {
    const num = Number(val);
    if (isNaN(num)) return "-";
    return (num / 1000).toFixed(2);
  }

  /**
   * Returns the formatted value for a given field key and info object.
   * For 'current' and 'hashRate', divides by 1000 and rounds to two decimals.
   * Returns '-' if value is missing.
   * For 'deviceLink', returns a Markdown link to the device.
   */
  function getField(ip: string, key: string) {
    if (loadingMap[ip]) return "Loading";
    if (errorMap[ip]) return "Error";
    if (key === "deviceLink") return `[Open](${`http://${ip}/#/`})`;
    const info = infoMap[ip];
    if (!info) return "-";
    if (["voltage", "current", "hashRate"].includes(key) && info[key]) return divideAndRound(info[key]);
    return info[key]?.toString() || "-";
  }

  /**
   * Renders a Markdown table for the given title and fields.
   * Each column corresponds to an IP/hostname, each row to a field.
   */
  function renderTable(title: string, fields: { label: string; key: string }[]) {
    const header = `| Field |${ipList.map((ip) => ` ${ip} |`).join("")}`;
    const sep = `| ------ |${ipList.map(() => " ----- | ").join("")}`;
    const rows = fields
      .map((f) => `| ${f.label} |${ipList.map((ip) => ` ${getField(ip, f.key)} |`).join("")}`)
      .join("\n");
    return `## ${title}\n\n${header}\n${sep}\n${rows}`;
  }

  const markdown = `# Bitaxe Status\n\n${renderTable("Status", allFields)}`;

  return (
    <Detail isLoading={ipList.some((ip) => loadingMap[ip])} navigationTitle={"Bitaxe Status"} markdown={markdown} />
  );
}
