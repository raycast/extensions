import * as fs from "fs";
import * as path from "path";
import * as os from "os";

function getCache() {
  // Get the user's home directory dynamically
  const homeDirectory = os.homedir();

  // Construct the path to the local cache file
  // This cache file is how Granola keeps your data secure
  // It stores your content on your machine, and not on Granola's servers
  const filePath = path.join(homeDirectory, "Library", "Application Support", "Granola", "cache-v3.json");

  try {
    // Read and parse the local JSON file
    const fileContent = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Get the cache data, parsing it only if it's a string
    const data = typeof jsonData.cache === "string" ? JSON.parse(jsonData.cache) : jsonData.cache;

    if (!data) {
      throw new Error(
        "Unable to find your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
      );
    }

    return data;
  } catch (error) {
    console.error("Error retrieving local cache", error);
    throw error;
  }
}

export default getCache;
