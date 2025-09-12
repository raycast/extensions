import fs from "fs";

/**
 * Search for gifski in common paths
 */
export async function findGifSkiPath(): Promise<string | null> {
  return findCLIPath("gifski");
}

/**
 * Search for ffmpeg in common paths
 */
export async function findFFMpegCLIPath(): Promise<string | null> {
  return findCLIPath("ffmpeg");
}

async function findCLIPath(cli: string): Promise<string | null> {
  try {
    const commonPaths = [
      // Homebrew (Intel)
      `/usr/local/bin/${cli}`,
      // Homebrew (Apple Silicon)
      `/opt/homebrew/bin/${cli}`,
    ];

    // Check if any of the common paths exist and meet version requirements
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        console.log(`Found System ${cli} at: ${path}`);
        return path;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error finding valid ${cli}:`, error);
    return null;
  }
}
