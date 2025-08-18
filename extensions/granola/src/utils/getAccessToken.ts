import { promises as fs } from "fs";
import { getSupabaseConfigPath } from "./granolaConfig";

async function getAccessToken() {
  const filePath = getSupabaseConfigPath();

  // Read and parse the JSON file
  const fileContent = await fs.readFile(filePath, "utf8");
  const jsonData = JSON.parse(fileContent);

  let accessToken;

  try {
    // First try WorkOS tokens (new auth method)
    if (jsonData.workos_tokens) {
      let workosTokens;
      if (typeof jsonData.workos_tokens === "string") {
        workosTokens = JSON.parse(jsonData.workos_tokens);
      } else if (typeof jsonData.workos_tokens === "object" && jsonData.workos_tokens !== null) {
        workosTokens = jsonData.workos_tokens;
      }

      if (workosTokens?.access_token) {
        accessToken = workosTokens.access_token;
      }
    }

    // Fallback to Cognito tokens for backward compatibility
    if (!accessToken && jsonData.cognito_tokens) {
      let cognitoTokens;
      if (typeof jsonData.cognito_tokens === "string") {
        cognitoTokens = JSON.parse(jsonData.cognito_tokens);
      } else if (typeof jsonData.cognito_tokens === "object" && jsonData.cognito_tokens !== null) {
        cognitoTokens = jsonData.cognito_tokens;
      }

      if (cognitoTokens?.access_token) {
        accessToken = cognitoTokens.access_token;
      }
    }
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error(String(error));
    throw new Error(`Failed to parse local access token: ${parseError.message}`);
  }

  if (!accessToken) {
    throw new Error(
      "Access token not found in your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
    );
  }

  return accessToken;
}

export default getAccessToken;
