import { getApplications } from "@raycast/api";
import { join } from "node:path";
import { askServer, runServer } from "./mcp";
import { sizewiseBundleIdentifier, sizewiseWebsite } from "./sizewise";

/**
 * Answers questions about scans saved in Sizewise with `sizewise-mcp`, the server the app carries
 * for AI assistants such as Claude, so Raycast AI reads saved scans the same way they do. The
 * server reads `.sizewise` files and nothing else, and answers in plain text. See CONTRIBUTING.md
 * (Ask your AI about your disk).
 */

const website = sizewiseWebsite.replace("https://", "");

/** The server in the installed Sizewise, which only the edition from Sizewise's website carries. */
export async function serverPath(): Promise<string> {
  const applications = await getApplications();
  const sizewise = applications.find((application) => application.bundleId === sizewiseBundleIdentifier);
  if (sizewise === undefined) throw new Error(`Sizewise isn't installed. Download it from ${website}.`);
  return join(sizewise.path, "Contents", "Helpers", "sizewise-mcp");
}

/** Asks Sizewise's server one question about saved scans and returns its plain-text answer. */
export async function askSizewise(tool: string, args: Record<string, unknown>): Promise<string> {
  const path = await serverPath();
  try {
    return await askServer(tool, args, (input) => runServer(path, input));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`This Sizewise can't answer questions about saved scans. Get the latest from ${website}.`);
    }
    throw error;
  }
}
