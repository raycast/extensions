import { LocalStorage, showToast, Toast } from "@raycast/api";

const TOKEN_KEY = "rewiser_token";
const USER_NAME_KEY = "rewiser_user_name";
const USER_EMAIL_KEY = "rewiser_user_email";

export async function getValidToken(): Promise<string> {
  try {
    const token = await LocalStorage.getItem<string>(TOKEN_KEY);
    if (!token) {
      throw new Error("No authentication token found");
    }
    return token;
  } catch {
    throw new Error("Authentication required");
  }
}

export async function saveToken(token: string): Promise<void> {
  try {
    await LocalStorage.setItem(TOKEN_KEY, token);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Storage Error",
      message: "Failed to save authentication token",
    });
    throw new Error("Failed to save token");
  }
}

export async function clearToken(): Promise<void> {
  try {
    await LocalStorage.removeItem(TOKEN_KEY);
    await LocalStorage.removeItem(USER_NAME_KEY);
    await LocalStorage.removeItem(USER_EMAIL_KEY);

    await LocalStorage.removeItem(TOKEN_KEY);
    await LocalStorage.removeItem(USER_NAME_KEY);
    await LocalStorage.removeItem(USER_EMAIL_KEY);

    await showToast({
      style: Toast.Style.Success,
      title: "Signed Out",
      message: "Authentication cleared successfully",
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: "Failed to clear authentication",
    });
    throw new Error("Failed to clear authentication");
  }
}

export async function getUserInfo(): Promise<{ name?: string; email?: string }> {
  try {
    const name = await LocalStorage.getItem<string>(USER_NAME_KEY);
    const email = await LocalStorage.getItem<string>(USER_EMAIL_KEY);
    return { name: name || undefined, email: email || undefined };
  } catch {
    return {};
  }
}

export async function isTokenValid(token: string): Promise<boolean> {
  try {
    const response = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/verify-auth", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
