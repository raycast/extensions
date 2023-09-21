import { authorize, client, OAuthClientId } from "./oauth";
import { calendar_v3, auth } from "@googleapis/calendar";

export async function getAuthorizedCalendarClient() {
  await authorize();
  console.log("get client");
  const t = await client.getTokens();

  const oAuth2Client = new auth.OAuth2(OAuthClientId());
  oAuth2Client.setCredentials({
    access_token: t?.accessToken,
    refresh_token: t?.refreshToken,
    id_token: t?.idToken,
    scope: t?.scope,
    expiry_date: t?.expiresIn,
  });
  const gm = new calendar_v3.Calendar({ auth: oAuth2Client });
  return gm;
}
