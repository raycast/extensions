import { XcodeCodeSnippetCompletionScope } from "./xcode-code-snippet-completion-scope.model";
import { XcodeCodeSnippetProgrammingLanguage } from "./xcode-code-snippet-programming-language.model";

/**
 * Xcode Code Snippet
 */
export interface XcodeCodeSnippet {
  IDECodeSnippetIdentifier: string;
  IDECodeSnippetVersion: number;
  IDECodeSnippetUserSnippet: boolean;
  IDECodeSnippetTitle: string;
  IDECodeSnippetSummary: string;
  IDECodeSnippetCompletionPrefix: string;
  IDECodeSnippetCompletionScopes: XcodeCodeSnippetCompletionScope[];
  IDECodeSnippetLanguage: XcodeCodeSnippetProgrammingLanguage;
  IDECodeSnippetContents: string;
}

/**
 * The default Xcode Snippet version
 */
export const XcodeCodeSnippetDefaultVersion = 2;
