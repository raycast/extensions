import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export interface Agent {
  id: string;
  name: string;
  content: string;
  filePath: string;
}

// TEMPORARY: Using mock agents-raycast folder for screenshots
const AGENTS_DIR = join(homedir(), ".claude", "agents");

/**
 * Get all agent files from ~/.claude/agents
 */
export async function getAgents(): Promise<Agent[]> {
  const files = await readdir(AGENTS_DIR);
  const agentFiles = files.filter((file) => file.endsWith(".md"));

  const agents = await Promise.all(
    agentFiles.map(async (file) => {
      const filePath = join(AGENTS_DIR, file);
      const content = await readFile(filePath, "utf-8");
      const id = file.replace(".md", "");

      return {
        id,
        name: id,
        content,
        filePath,
      };
    }),
  );

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}
