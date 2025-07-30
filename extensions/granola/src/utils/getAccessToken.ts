import { promises as fs } from "fs";
import { getSupabaseConfigPath } from "./granolaConfig";

async function getAccessToken() {
  const filePath = getSupabaseConfigPath();

  // Read and parse the JSON file
  const fileContent = await fs.readFile(filePath, "utf8");
  const jsonData = JSON.parse(fileContent);

  // Handle cognito_tokens which could be either a JSON string or an object
  let cognitoTokens;
  try {
    // If cognito_tokens is a string, parse it as JSON
    if (typeof jsonData.cognito_tokens === "string") {
      cognitoTokens = JSON.parse(jsonData.cognito_tokens);
    } else if (typeof jsonData.cognito_tokens === "object" && jsonData.cognito_tokens !== null) {
      // If it's already an object, use it directly
      cognitoTokens = jsonData.cognito_tokens;
    } else {
      throw new Error("cognito_tokens is neither a valid JSON string nor an object");
    }
  } catch (error) {
    // Ensure error is treated as an Error object with a message property
    const parseError = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to parse local access token: ${parseError.message}`);
  }
  // Extract the access token
  const accessToken = cognitoTokens.access_token;

  if (!accessToken) {
    throw new Error(
      "Access token not found in your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
    );
  }

  return accessToken;
}

export default getAccessToken;
