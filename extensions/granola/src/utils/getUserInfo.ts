import { promises as fs } from "fs";
import { getSupabaseConfigPath } from "./granolaConfig";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function getUserInfo(): Promise<UserInfo> {
  // Get the platform-specific path to the supabase.json file
  const filePath = getSupabaseConfigPath();

  try {
    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Handle user_info which could be either a JSON string or an object
    let userInfo;
    try {
      // If user_info is a string, parse it as JSON
      if (typeof jsonData.user_info === "string") {
        userInfo = JSON.parse(jsonData.user_info);
      } else if (typeof jsonData.user_info === "object" && jsonData.user_info !== null) {
        // If it's already an object, use it directly
        userInfo = jsonData.user_info;
      } else {
        throw new Error("user_info is neither a valid JSON string nor an object");
      }
    } catch (error) {
      // Ensure error is treated as an Error object with a message property
      const parseError = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to parse user_info: ${parseError.message}`);
    }

    // Extract user information
    const userId = userInfo.id;
    const email = userInfo.email;
    const name = userInfo.user_metadata?.name || userInfo.name || email.split("@")[0];
    const picture = userInfo.user_metadata?.picture;

    if (!userId) {
      throw new Error("User ID not found in user_info");
    }

    if (!email) {
      throw new Error("Email not found in user_info");
    }

    return {
      id: userId,
      email,
      name,
      picture,
    };
  } catch (error) {
    throw new Error(
      `Failed to get Granola user info: ${error}. Please make sure Granola is installed, running, and that you are logged in to the application. Attempted to read from: ${filePath} (Platform: ${process.platform})`,
      { cause: error },
    );
  }
}

export default getUserInfo;
