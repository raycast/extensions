import { XcodeCodeSnippet } from "../models/xcode-code-snippet/xcode-code-snippet.model";
import Path from "path";
import * as os from "os";
import { existsAsync, makeDirectoryAsync, readDirectoryAsync, readFileAsync, writeFileAsync } from "../shared/fs-async";
import { build as buildPlist, parse as parsePlist } from "plist";

/**
 * XcodeCodeSnippetService
 */
export class XcodeCodeSnippetService {
  /**
   * Xcode Code Snippets Directory Path
   */
  private static get directoryPath(): string {
    return Path.join(os.homedir(), "Library", "Developer", "Xcode", "UserData", "CodeSnippets");
  }

  /**
   * Retrieve the file path of a Xcode Code Snippet
   * @param codeSnippet The Xcode Code Snippet
   */
  static codeSnippetFilePath(codeSnippet: XcodeCodeSnippet): string {
    return `${Path.join(XcodeCodeSnippetService.directoryPath, codeSnippet.IDECodeSnippetIdentifier)}.codesnippet`;
  }

  /**
   * Retrieve all Xcode Code Snippets
   */
  static async codeSnippets(): Promise<XcodeCodeSnippet[]> {
    await XcodeCodeSnippetService.createDirectoryPathIfNeeded();
    return (
      (
        await Promise.allSettled(
          (
            await readDirectoryAsync(XcodeCodeSnippetService.directoryPath)
          )
            .map((entry) => Path.join(XcodeCodeSnippetService.directoryPath, entry))
            .map(async (codeSnippetFile) => {
              const codeSnippetFileContents = await readFileAsync(codeSnippetFile, "utf-8");
              const codeSnippetPlist = parsePlist(codeSnippetFileContents);
              if (!codeSnippetPlist) {
                return undefined;
              }
              return JSON.parse(JSON.stringify(codeSnippetPlist)) as XcodeCodeSnippet;
            })
        )
      )
        .map((result) => (result.status === "fulfilled" ? result.value : undefined))
        .filter(Boolean) as XcodeCodeSnippet[]
    ).sort((lhs, rhs) => lhs.IDECodeSnippetTitle.localeCompare(rhs.IDECodeSnippetTitle));
  }

  /**
   * Save a Xcode Code Snippet
   * @param codeSnippet The Xcode Code Snippet which should be saved
   */
  static async save(codeSnippet: XcodeCodeSnippet) {
    await XcodeCodeSnippetService.createDirectoryPathIfNeeded();
    await writeFileAsync(
      XcodeCodeSnippetService.codeSnippetFilePath(codeSnippet),
      buildPlist({ ...codeSnippet }),
      "utf-8"
    );
  }

  /**
   * Create directory path if needed
   */
  private static async createDirectoryPathIfNeeded() {
    const directoryPath = XcodeCodeSnippetService.directoryPath;
    try {
      // Check if directory path does not exist
      if (!(await existsAsync(directoryPath))) {
        // Make directory
        await makeDirectoryAsync(directoryPath);
      }
    } catch {
      // Ignore any error
    }
  }
}
