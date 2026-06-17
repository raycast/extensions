import { XcodeCodeSnippetProgrammingLanguage } from "./xcode-code-snippet-programming-language.model";
import { XcodeCodeSnippetCompletionScope } from "./xcode-code-snippet-completion-scope.model";

/**
 * Xcode Code Snippet Form Values
 */
export interface XcodeCodeSnippetFormValues {
  title: string;
  summary: string;
  contents: string;
  language: XcodeCodeSnippetProgrammingLanguage;
  completionPrefix: string;
  completionScopes: XcodeCodeSnippetCompletionScope[];
}
