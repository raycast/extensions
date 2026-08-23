import { request } from "node:https";
import { URL, URLSearchParams } from "node:url";

export const THE_FOREST_URL = "https://theforest.link/";
export const WALK_URL = `${THE_FOREST_URL}go-for-a-walk/`;
const PLANT_URL = `${THE_FOREST_URL}api/submit/index.php`;

export function normalizeWebsiteUrl(value: string) {
  const website = new URL(value.trim());
  if (website.protocol !== "http:" && website.protocol !== "https:") {
    throw new Error("Website must use HTTP or HTTPS");
  }
  return website.toString();
}

function getRedirect(url: string) {
  return new Promise<string>((resolve, reject) => {
    const walk = request(url, { method: "GET" });

    walk.on("response", (response) => {
      response.resume();
      const location = response.headers.location;
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && location) {
        resolve(new URL(location, url).toString());
      } else {
        reject(new Error("The Forest did not return a walk destination"));
      }
    });
    walk.on("error", reject);
    walk.end();
  });
}

export async function resolveWalkDestination() {
  let currentUrl = WALK_URL;

  for (let redirectCount = 0; redirectCount < 5; redirectCount++) {
    const destination = new URL(await getRedirect(currentUrl));

    if (destination.hostname !== "theforest.link") {
      if (destination.protocol !== "http:" && destination.protocol !== "https:") {
        throw new Error("The Forest returned an unsupported destination");
      }
      return destination.toString();
    }

    currentUrl = destination.toString();
  }

  throw new Error("The Forest returned too many redirects");
}

export function plantWebsite(website: string) {
  const body = new URLSearchParams({ website }).toString();

  return new Promise<void>((resolve, reject) => {
    const submission = request(PLANT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    });

    submission.on("response", (response) => {
      response.resume();
      response.on("end", () => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode >= 200 && statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`The Forest returned ${statusCode} ${response.statusMessage ?? ""}`.trim()));
        }
      });
    });
    submission.on("error", reject);
    submission.end(body);
  });
}
