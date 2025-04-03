import path from "path";
import fs from "fs-extra";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

// Checks if a file is an image based on its extension
export function isImageFile(filePath: string): boolean {
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff", ".heic"];
  const extension = path.extname(filePath).toLowerCase();
  return imageExtensions.includes(extension);
}

// Extracts the file extension from a path
export function getFileExtension(filePath: string): string {
  return path.extname(filePath);
}

// Get file name without extension
export function getFileNameWithoutExtension(filePath: string): string {
  const baseName = path.basename(filePath);
  const extension = path.extname(baseName);
  return baseName.replace(extension, "");
}

// Generates a new file path with the new name
export function generateNewFilePath(originalFilePath: string, newName: string): string {
  const dirName = path.dirname(originalFilePath);
  const extension = getFileExtension(originalFilePath);
  return path.join(dirName, `${newName}${extension}`);
}

// Renames a file
export async function renameFile(originalFilePath: string, newFilePath: string): Promise<void> {
  try {
    // Check if a file with the new name already exists
    if (await fs.pathExists(newFilePath)) {
      // If it exists, add a number to the filename
      const dirName = path.dirname(newFilePath);
      const extension = getFileExtension(newFilePath);
      const nameWithoutExt = getFileNameWithoutExtension(newFilePath);

      let counter = 1;
      let uniqueFilePath = newFilePath;

      while (await fs.pathExists(uniqueFilePath)) {
        uniqueFilePath = path.join(dirName, `${nameWithoutExt}-${counter}${extension}`);
        counter++;
      }

      newFilePath = uniqueFilePath;
    }

    // Rename the file
    await fs.move(originalFilePath, newFilePath);
  } catch (error) {
    throw new Error(`Failed to rename file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Set metadata for a file to enable macOS Spotlight and Raycast search
export async function setFileMetadata(filePath: string, textContent: string): Promise<void> {
  try {
    if (textContent && textContent.trim()) {
      // Escape the text content for the shell command
      const escapedText = textContent
        .replace(/"/g, '\\"') // Escape double quotes
        .replace(/\$/g, "\\$") // Escape dollar signs
        .replace(/`/g, "\\`"); // Escape backticks

      // Add com.apple.metadata:kMDItemFinderComment attribute
      // This comment will be searchable by Spotlight and Raycast
      await execPromise(`xattr -w com.apple.metadata:kMDItemFinderComment "${escapedText}" "${filePath}"`);

      console.log(`Set metadata for ${filePath}`);

      // Touch the file to ensure Spotlight re-indexes it
      await execPromise(`touch "${filePath}"`);
    } else {
      console.log(`No text content to set as metadata for ${filePath}`);
    }
  } catch (error) {
    console.error(`Failed to set metadata: ${error instanceof Error ? error.message : String(error)}`);
    // We don't want to fail the entire process if metadata setting fails
    // So just log the error but don't throw
  }
}
