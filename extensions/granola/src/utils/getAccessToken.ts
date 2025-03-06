import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getAccessToken() {
  // Get the user's home directory dynamically
  const homeDirectory = os.homedir();

  // Construct the path to the supabase.json file
  const filePath = path.join(homeDirectory, "Library", "Application Support", "Granola", "supabase.json");

  try {
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Parse the cognito_tokens string as it's stored as a JSON string
    const cognitoTokens = JSON.parse(jsonData.cognito_tokens);
    // Extract the access token
    const accessToken = cognitoTokens.access_token;

    if (!accessToken) {
      throw new Error(
        "Access token not found in your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
      );
    }

    return accessToken;
  } catch (error) {
    console.error("Error retrieving access token:", error);
    throw error;
  }
}

export default getAccessToken;
