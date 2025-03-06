import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getCache() {
  // Get the user's home directory dynamically
  const homeDirectory = os.homedir();

  // Construct the path to the supabase.json file
  const filePath = path.join(homeDirectory, "Library", "Application Support", "Granola", "cache-v3.json");

  try {
    // Read and parse the JSON file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Parse the cognito_tokens string as it's stored as a JSON string
    const data = JSON.parse(jsonData.cache);

    if (!data) {
      throw new Error(
        "Access token not found in the supabase.json file. Make sure Granola is installed, running, and that you are logged in.",
      );
    }

    return data;
  } catch (error) {
    console.error("Error retrieving local cache", error);
    throw error;
  }
}

export default getCache;
