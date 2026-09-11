import { Color } from "@raycast/api";

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPortList(ports: number[]): string {
  if (!ports || ports.length === 0) return "None";
  if (ports.length <= 5) return ports.join(", ");
  return `${ports.slice(0, 5).join(", ")} (+${ports.length - 5} more)`;
}

export function getServiceNameForPort(port: number): string {
  const portServices: Record<number, string> = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    445: "SMB",
    993: "IMAPS",
    995: "POP3S",
    1433: "MSSQL",
    1521: "Oracle",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP-Alt",
    8443: "HTTPS-Alt",
    27017: "MongoDB",
  };
  return portServices[port] || `Port ${port}`;
}

export function getPortColor(port: number): Color {
  const dangerousPorts = [23, 21, 445, 3389, 5900]; // Telnet, FTP, SMB, RDP, VNC
  const securePorts = [22, 443, 993, 995]; // SSH, HTTPS, secure mail
  const webPorts = [80, 8080, 8443];
  const dbPorts = [3306, 5432, 27017, 6379, 1433, 1521];

  if (dangerousPorts.includes(port)) return Color.Red;
  if (securePorts.includes(port)) return Color.Green;
  if (webPorts.includes(port)) return Color.Blue;
  if (dbPorts.includes(port)) return Color.Orange;
  return Color.SecondaryText;
}

export function formatCredits(credits: number): string {
  if (credits === 0) return "No credits";
  if (credits === 1) return "1 credit";
  return `${credits.toLocaleString()} credits`;
}

export function getCreditColor(credits: number): Color {
  if (credits <= 0) return Color.Red;
  if (credits <= 10) return Color.Orange;
  if (credits <= 50) return Color.Yellow;
  return Color.Green;
}

export function getRiskColor(risk: "low" | "medium" | "high"): Color {
  switch (risk) {
    case "high":
      return Color.Red;
    case "medium":
      return Color.Orange;
    case "low":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}
