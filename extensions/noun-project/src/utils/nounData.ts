import { getPreferenceValues } from "@raycast/api";
import { OAuth } from "oauth";

const preferences = getPreferenceValues<Preferences>();
const KEY = preferences.apiKey;
const SECRET = preferences.apiSecret;

export function nounProjectData(route: string) {
  const oauth = new OAuth(
    "https://api.thenounproject.com",
    "https://api.thenounproject.com",
    KEY,
    SECRET,
    "1.0",
    null,
    "HMAC-SHA1",
  );

  const url = "https://api.thenounproject.com/v2/" + route;

  return new Promise((resolve, reject) => {
    oauth.get(url, "", "", function (e, data, res) {
      if (e) {
        console.error(e);
        reject(e);
      } else {
        // Parse the response data as JSON
        try {
          if (typeof data !== "string") {
            throw new Error("Invalid data type");
          }
          const jsonData = JSON.parse(data);
          resolve({ e, data: jsonData, res });
        } catch (error) {
          // Handle JSON parsing error
          console.error("Error parsing JSON data:", error);
          reject(error);
        }
      }
    });
  });
}
