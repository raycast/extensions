import fetch from "node-fetch";

export async function getCurrentLocation(): Promise<{ city: string; countryCode: string }> {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) {
      throw new Error(`Error fetching location: ${response.statusText}`);
    }
    const data = (await response.json()) as { city: string; country_code: string };
    return { city: data.city, countryCode: data.country_code };
  } catch (error) {
    return { city: "Unknown", countryCode: "Unknown" };
  }
}
