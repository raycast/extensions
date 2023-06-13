import { XcodeCodeSnippetCompletionScope } from "../models/xcode-code-snippet/xcode-code-snippet-completion-scope.model";

export function XcodeCodeSnippetCompletionScopeName(completionScope: XcodeCodeSnippetCompletionScope): string {
  switch (completionScope) {
    case XcodeCodeSnippetCompletionScope.all:
      return "All Scopes";
    case XcodeCodeSnippetCompletionScope.classImplementation:
      return "Class Implementation";
    case XcodeCodeSnippetCompletionScope.codeExpression:
      return "Code Expression";
    case XcodeCodeSnippetCompletionScope.codeBlock:
      return "Function or Method";
    case XcodeCodeSnippetCompletionScope.stringOrComment:
      return "String or Comment";
    case XcodeCodeSnippetCompletionScope.topLevel:
      return "Top Level";
  }
}
