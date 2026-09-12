import { client } from "../api/client";

export default async function ListFiles() {
  try {
    const files = await client.listFiles();

    if (files.length === 0) {
      return {
        success: true,
        message: "No files found in the Lokalise project",
        files: [],
      };
    }

    return {
      success: true,
      message: `Found ${files.length} file${files.length !== 1 ? "s" : ""} in the Lokalise project`,
      files: files.map((file) => ({
        filename: file.filename,
        fileId: file.fileId,
      })),
      instructions:
        "Use the 'filename' value when assigning a file to a translation key with the 'add-translation-key' tool.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list files",
    };
  }
}
