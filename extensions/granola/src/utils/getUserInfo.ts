import { getLocalGranolaUserInfo } from "./getAccessToken";
import { toErrorMessage } from "./errorUtils";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getUserInfo(): Promise<UserInfo> {
  try {
    const { userInfo } = await getLocalGranolaUserInfo();

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
    throw new Error(
      `Failed to get Granola user info: ${toErrorMessage(error)}. Please make sure Granola is installed, running, and that you are logged in to the application. (Platform: ${process.platform})`,
      { cause: error },
    );
  }
}

export default getUserInfo;
