import fetch from "node-fetch";

// Get the flag emoji for a given country code
function countryCodeToFlagEmoji(countryCode: string): string {
  return countryCode.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

// Get IP details
export async function getIPDetails(ip: string): Promise<string> {
  if (ip === "Get IP Failed") return "N/A";
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Error: ${data.message}`);
    }
    return `${data.city}, ${data.country} ${countryCodeToFlagEmoji(data.countryCode)}`;
  } catch (error) {
    console.error("Error fetching IP details:", error);
    return "Failed to fetch IP details";
  }
}
