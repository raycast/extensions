import fetch from "node-fetch";

function isValidIP(ip: string) {
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){0,6}([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,6}([0-9a-fA-F]{1,4})?))$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

export const getExternalIP = async (sourceID: string) => {
  if (sourceID === "1") {
    return getIPFromIPIP();
  } else if (sourceID === "2") {
    return getIPFromIPCheck4();
  } else if (sourceID === "3") {
    return getIPFromIPCheck6();
  } else if (sourceID === "4") {
    return getIPFromCloudflare_V4();
  } else if (sourceID === "5") {
    return getIPFromCloudflare_V6();
  }
};

const getIPFromIPCheck4 = async () => {
  try {
    const response = await fetch("https://4.ipcheck.ing/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "IPCheck IPv4",
    };
  } catch (error) {
    console.error("Error fetching IP from IPCheck IPv4:", error);
    return {
      ip: "Get IP Failed",
      source: "IPCheck IPv4",
    };
  }
};

const getIPFromIPCheck6 = async () => {
  try {
    const response = await fetch("https://6.ipcheck.ing/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "IPCheck IPv6",
    };
  } catch (error) {
    console.error("Error fetching IP from IPCheck IPv6:", error);
    return {
      ip: "Get IP Failed",
      source: "IPCheck IPv6",
    };
  }
};

const getIPFromCloudflare_V4 = async () => {
  try {
    const response = await fetch("https://1.0.0.1/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "Cloudflare IPv4",
    };
  } catch (error) {
    console.error("Error fetching IP from Cloudflare IPv4:", error);
    return {
      ip: "Get IP Failed",
      source: "Cloudflare IPv4",
    };
  }
};

const getIPFromCloudflare_V6 = async () => {
  try {
    const response = await fetch("https://[2606:4700:4700::1111]/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "Cloudflare IPv6",
    };
  } catch (error) {
    console.error("Error fetching IP from Cloudflare IPv6:", error);
    return {
      ip: "Get IP Failed",
      source: "Cloudflare IPv6",
    };
  }
};

const getIPFromIPIP = async () => {
  try {
    const response = await fetch("https://myip.ipip.net/json");
    const data = await response.json();
    const ip = data.data.ip;
    const source = "IPIP.net";
    if (isValidIP(ip)) {
      return {
        ip: ip,
        source: source,
      };
    } else {
      console.error("Invalid IP from IPIP.net:", ip);
    }
  } catch (error) {
    console.error("Error fetching IP from IPIP.net:", error);
    return {
      ip: "Get IP Failed",
      source: "IPIP.net",
    };
  }
};
