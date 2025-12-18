import { OAuthService } from "@raycast/utils";

const CLIENT_ID =
  "793622924878-jpgina4n8hsb45s9qi8erumj70oohqt7.apps.googleusercontent.com";

export const google = OAuthService.google({
  clientId: CLIENT_ID,
  scope: [
    "https://www.googleapis.com/auth/drive.file", // Create and access files created by this app
    "https://www.googleapis.com/auth/drive.readonly", // Read-only access to list folders
  ].join(" "),
});

export async function getAccessToken(): Promise<string> {
  const tokens = await google.client.getTokens();
  return tokens?.accessToken ?? "";
}
