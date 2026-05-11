import { Logger } from "@/api/logger/logger.service";
import { showToast, Toast } from "@raycast/api";

import fs from "fs";
import path from "path";

export interface Note {
  title: string;
  path: string;
  lastModified: Date;
  bookmarked: boolean;
}

export interface NoteWithContent extends Note {
  content: string;
}

const logger = new Logger("Notes");

export function appendText(notePath: string, content: string) {
  fs.appendFileSync(notePath, "\n" + content);
}

/** Gets the Obsidian Properties YAML frontmatter for a list of tags */
export function createProperties(tags: string[]): string {
  let obsidianProperties = "";
  if (tags.length > 0) {
    obsidianProperties = "---\ntags: [";
    for (let i = 0; i < tags.length - 1; i++) {
      obsidianProperties += '"' + tags[i] + '",';
    }
    obsidianProperties += '"' + tags[tags.length - 1] + '"]\n---\n';
  }

  return obsidianProperties;
}

/** Writes a text to a markdown file at filePath with a given fileName. */
export function writeMarkdown(
  filePath: string,
  fileName: string,
  text: string,
  onDirectoryCreationFailed?: (filePath: string) => void,
  onFileWriteFailed?: (filePath: string, fileName: string) => void
) {
  // First try creating the folder structure
  try {
    fs.mkdirSync(filePath, { recursive: true });
  } catch {
    logger.warning("Failed to create directory structure");
    onDirectoryCreationFailed?.(filePath);
    return;
  }

  // Then try writing the markdown file
  try {
    fs.writeFileSync(path.join(filePath, fileName + ".md"), text);
  } catch {
    logger.warning("Failed to write file");
    onFileWriteFailed?.(filePath, fileName);
    return;
  }
  logger.success(`Note created at "${filePath}/${fileName}" with content "${text}"`);
  showToast({ title: "Note created", style: Toast.Style.Success });
}

export function isNote(note: Note | undefined): note is Note {
  return (note as Note) !== undefined;
}

export function deleteNote(note: Note) {
  if (!fs.existsSync(note.path)) {
    logger.warning(`Could not delete note ${note.path}. This path does not exist`);
    return false;
  }
  fs.unlinkSync(note.path);
  logger.success(`Deleted note ${note.path}`);
  return true;
}
