import fetch from "node-fetch";

function isValidIP(ip: string) {
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern =
    /^(([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4})|(([0-9a-fA-F]{1,4}:){0,6}([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,6}([0-9a-fA-F]{1,4})?))$/;
  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

// Get external IP
export const getExternalIP = async (key: string) => {
  switch (key) {
    case "getIPFromIPCheck4":
      return await getIPFromIPCheck4();
    case "getIPFromIPCheck6":
      return await getIPFromIPCheck6();
    case "getIPFromIPCheck64":
      return await getIPFromIPCheck64();
    case "getIPFromCloudflare_V4":
      return await getIPFromCloudflare_V4();
    case "getIPFromCloudflare_V6":
      return await getIPFromCloudflare_V6();
    case "getIPFromIPIP":
      return await getIPFromIPIP();
  }
};

// Get IP from IPCheck4
const getIPFromIPCheck4 = async () => {
  try {
    const response = await fetch("https://4.ipcheck.ing/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "IPCheck.ing IPv4",
    };
  } catch (error) {
    console.error("Error fetching IP from IPCheck IPv4:", error);
    return {
      ip: "Get IP Failed",
      source: "IPCheck.ing IPv4",
    };
  }
};

// Get IP from IPCheck6
const getIPFromIPCheck6 = async () => {
  try {
    const response = await fetch("https://6.ipcheck.ing/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "IPCheck.ing IPv6",
    };
  } catch (error) {
    console.error("Error fetching IP from IPCheck IPv6:", error);
    return {
      ip: "Get IP Failed",
      source: "IPCheck.ing IPv6",
    };
  }
};

// Get IP from IPCheck64
const getIPFromIPCheck64 = async () => {
  try {
    const response = await fetch("https://64.ipcheck.ing/cdn-cgi/trace");
    const data = await response.text();
    const ipLine = data.split("\n").find((line) => line.startsWith("ip="));
    return {
      ip: ipLine ? ipLine.split("=")[1] : "",
      source: "IPCheck DualStack",
    };
  } catch (error) {
    console.error("Error fetching IP from IPCheck DualStack:", error);
    return {
      ip: "Get IP Failed",
      source: "IPCheck.ing DualStack",
    };
  }
};

// Get IP from Cloudflare IPv4
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

// Get IP from Cloudflare IPv6
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

// Get IP from IPIP.net
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
