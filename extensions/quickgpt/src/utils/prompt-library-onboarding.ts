import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const STARTER_LIBRARY_FILENAME = "starter-library.hjson";
export const DEFAULT_PROMPT_LIBRARY_FOLDER = "QuickGPT Prompts";

export function getDefaultPromptLibraryDirectory(): string {
  return path.join(os.homedir(), "Documents", DEFAULT_PROMPT_LIBRARY_FOLDER);
}

export function getStarterLibrarySourcePath(): string {
  return path.join(__dirname, "assets", STARTER_LIBRARY_FILENAME);
}

export interface CreatePromptLibraryResult {
  directory: string;
  filePath: string;
  createdDirectory: boolean;
  copiedFile: boolean;
}

/**
 * Creates `~/Documents/QuickGPT Prompts` and copies the bundled starter
 * template into it. Existing files are left untouched.
 */
export async function createPromptLibrary(options?: {
  directory?: string;
  sourcePath?: string;
}): Promise<CreatePromptLibraryResult> {
  const directory = options?.directory ?? getDefaultPromptLibraryDirectory();
  const sourcePath = options?.sourcePath ?? getStarterLibrarySourcePath();
  const filePath = path.join(directory, STARTER_LIBRARY_FILENAME);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Starter prompt template is missing: ${sourcePath}`);
  }

  let createdDirectory = false;
  if (!fs.existsSync(directory)) {
    await fs.promises.mkdir(directory, { recursive: true });
    createdDirectory = true;
  } else {
    const stats = await fs.promises.stat(directory);
    if (!stats.isDirectory()) {
      throw new Error(`Prompt library path exists but is not a directory: ${directory}`);
    }
  }

  let copiedFile = false;
  if (!fs.existsSync(filePath)) {
    await fs.promises.copyFile(sourcePath, filePath);
    copiedFile = true;
  }

  return { directory, filePath, createdDirectory, copiedFile };
}
