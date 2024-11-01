import { environment, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { writeFileSync } from "fs";
import fetch from "node-fetch";
import { execSync } from "node:child_process";
import { join } from "path";

export interface CliMetaResult {
  scopes: Scope[];
  chunk_size: number;
}

export interface Scope {
  id: number;
  name: string;
}

export default async function main() {
  const indexPath = join(environment.supportPath, "index.ixx");

  try {
    // Fetch and write index to disk
    const response = await fetch(`https://search.nüschtos.de/index.ixx`, { method: "GET" });
    const data = await response.arrayBuffer();
    writeFileSync(indexPath, Buffer.from(data));

    // Get and store meta results
    const metaCommand = `/Users/lucas.rott/git/private/raycast/nuschtos/ixx meta -f json -i "${indexPath}"`;
    const cliMetaResult: CliMetaResult = JSON.parse(execSync(metaCommand).toString());
    await LocalStorage.setItem("cliMetaResult", JSON.stringify(cliMetaResult));

    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD("✅ NüschtOS index and meta data refreshed");
    }
  } catch (error) {
    console.error("Failed to refresh index:", error);
    if (environment.launchType === LaunchType.UserInitiated) {
      await showHUD("❌ Failed to refresh NüschtOS index");
    }
    throw error;
  }
}
