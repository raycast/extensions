import { environment } from "@raycast/api";
import { OAuthService, getAccessToken } from "@raycast/utils";
import jwt_decode from "jwt-decode";

let email: string | undefined;

export const google = OAuthService.google({
  // Google Cloud Project: https://ray.so/ci5QOJb
  clientId:
    getAppFlavor() === "internal"
      ? "859594387706-m8618flpnahvmr5j8jjni2sfrbiunurv.apps.googleusercontent.com"
      : "859594387706-uunbhp90efuesm18epbs0pakuft1m1kt.apps.googleusercontent.com",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scope:
    "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.readonly",
  onAuthorize({ idToken }) {
    if (!idToken) return;

    const { email: decodedEmail } = jwt_decode<{ email?: string }>(idToken);
    email = decodedEmail;
  },
});

export function getOAuthToken(): string {
  const { token } = getAccessToken();
  return token;
}

export function getUserEmail(): string {
  if (!email) {
    throw new Error("getUserEmail must be used when authenticated");
  }

  return email;
}

function getAppFlavor() {
  if (environment.supportPath.includes("com.raycast.macos.debug")) {
    return "debug";
  } else if (environment.supportPath.includes("com.raycast.macos.internal")) {
    return "internal";
  } else {
    return "release";
  }
}
