import getAccessToken from "./getAccessToken";
import { granolaFetch } from "./granolaFetch";
import { toErrorMessage } from "./errorUtils";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getUserInfo(): Promise<UserInfo> {
  try {
    const accessToken = await getAccessToken();
    const response = await granolaFetch("https://api.granola.ai/v1/get-user-info", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(20_000),
    });
    const userInfo = (await response.json()) as Record<string, unknown>;

    // Extract user information
    const userId = userInfo.id;
    const email = userInfo.email;
    const userMetadata =
      userInfo.user_metadata && typeof userInfo.user_metadata === "object"
        ? (userInfo.user_metadata as Record<string, unknown>)
        : undefined;
    const name = userMetadata?.name || userInfo.name || (typeof email === "string" ? email.split("@")[0] : undefined);
    const picture = userMetadata?.picture;

    if (typeof userId !== "string" || !userId) {
      throw new Error("User ID not found in user_info");
    }

    if (typeof email !== "string" || !email) {
      throw new Error("Email not found in user_info");
    }

    return {
      id: userId,
      email,
      name: typeof name === "string" ? name : email.split("@")[0],
      picture: typeof picture === "string" ? picture : undefined,
    };
  } catch (error) {
    throw new Error(`Failed to get Granola user info: ${toErrorMessage(error)}`, { cause: error });
  }
}

export default getUserInfo;
