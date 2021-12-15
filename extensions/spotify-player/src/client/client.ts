import { getLocalStorageItem, preferences, setLocalStorageItem, showToast, ToastStyle } from "@raycast/api";
import SpotifyWebApi from "spotify-web-api-node";
import { Response } from "./interfaces";
import { AuthResponseCredentials } from "./spoti";

const debugMode = false;

export const spotifyApi = new SpotifyWebApi();

export function authorize(): void {
  const clientId = preferences.clientId?.value as string;
  const secret = preferences.secret?.value as string;

  if (clientId?.length != 0 && secret?.length != 0) {
    spotifyApi.setClientId(clientId);
    spotifyApi.setClientSecret(secret);
    getLocalStorageItem("authData").then((item) => {
      if (!item) {
        debugLog("Getting new token");
        authenticate();
      } else {
        const json = JSON.parse(item as string);
        const token: string = json.token;
        const exp: number = json.expires_in;
        const date = new Date().getTime();
        debugLog(`Current time: ${date}, token expires at: ${exp}`);
        if (token.length > 0 && exp > date) {
          debugLog("Using old token", token);
          spotifyApi.setAccessToken(token);
        } else {
          debugLog("Getting new token");
          authenticate();
        }
      }
    });
  }
}

async function authenticate(): Promise<void> {
  const authResponse = await getToken();
  debugLog("authResponse", authResponse);

  if (authResponse.result) {
    const token = authResponse.result.access_token;

    if (token.length > 0) {
      spotifyApi.setAccessToken(token);
      const date = new Date();
      date.setSeconds(date.getSeconds() + authResponse.result.expires_in);
      const exp = date.getTime();
      debugLog(`token: ${token}, expires in: ${exp}`);
      setLocalStorageItem("authData", JSON.stringify({ token: token, expires_in: exp }));
    }
  } else if (authResponse.error) {
    showToast(ToastStyle.Failure, authResponse.error);
  }
}

async function getToken(): Promise<Response<AuthResponseCredentials>> {
  const result: Response<AuthResponseCredentials> = await spotifyApi
    .clientCredentialsGrant()
    .then((response: { body: any }) => {
      return {
        result: response.body,
      };
    })
    .catch((error) => {
      return { error: error.toString() };
    });
  return result;
}

function debugLog(...params: unknown[]): void {
  if (!debugMode) return;
  const logParams: unknown[] = params.map((val) => {
    try {
      return JSON.stringify(val);
    } catch (error) {
      return `Could not stringify debug log: ${error}`;
    }
  });
  console.log(...logParams);
}
