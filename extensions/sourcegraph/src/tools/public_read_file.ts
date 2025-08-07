import { sourcegraphDotCom } from "../sourcegraph";
import { executeFileRead } from "./shared/fileread";

type Input = {
  /**
   * Repository name (e.g., "github.com/facebook/react" or "facebook/react")
   */
  repository: string;
  /**
   * File path within the repository (e.g., "packages/react/src/React.js")
   */
  path: string;
  /**
   * Git revision (branch, tag, or commit SHA). Defaults to "HEAD" (latest).
   */
  revision?: string;
  /**
   * Starting line number for partial file read (1-indexed).
   * If not specified, reads from the beginning of the file.
   */
  startLine?: number;
  /**
   * Ending line number for partial file read (1-indexed, inclusive).
   * If not specified, reads to the end of the file.
   */
  endLine?: number;
};

/**
 * Read the complete contents of a specific file from public repositories on Sourcegraph.com.
 * This tool retrieves the full text content of any file in open source repositories.
 * Use when you need to examine the complete source code of a specific file in public projects.
 */
export default async function tool(params: Input) {
  const { repository, path, revision, startLine, endLine } = params;
  // Create Sourcegraph client for public code search
  const src = await sourcegraphDotCom();

  // Read the file contents
  const result = await executeFileRead(src, repository, path, revision, startLine, endLine);

  if (!result) {
    throw new Error("File not found or could not be read");
  }

  return result;
}
