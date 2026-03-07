import {
  getPreferenceValues,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";

interface Preferences {
  apiToken?: string;
  authMethod: "apiKey" | "device";
}

export async function isAuthenticated(): Promise<boolean> {
  const prefs = getPreferenceValues<Preferences>();

  if (prefs.authMethod === "device") {
    const token = await LocalStorage.getItem<string>("device-token");
    return !!token;
  } else {
    return !!prefs.apiToken;
  }
}

export async function checkAuthAndPrompt(): Promise<boolean> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not Authenticated",
      message: "Please connect your device or add an API token in preferences",
    });
  }

  return authenticated;
}

export async function getAuthInfo(): Promise<{
  method: "device" | "apiKey";
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
}> {
  const prefs = getPreferenceValues<Preferences>();
  const authenticated = await isAuthenticated();

  let userEmail: string | undefined;
  let userName: string | undefined;

  if (prefs.authMethod === "device") {
    userEmail = (await LocalStorage.getItem<string>("user-email")) || undefined;
    userName = (await LocalStorage.getItem<string>("user-name")) || undefined;
  }

  return {
    method: prefs.authMethod,
    isAuthenticated: authenticated,
    userEmail,
    userName,
  };
}
