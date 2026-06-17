import { XcodeCodeSnippetProgrammingLanguage } from "../models/xcode-code-snippet/xcode-code-snippet-programming-language.model";

export function XcodeCodeSnippetProgrammingLanguageName(
  programmingLanguage: XcodeCodeSnippetProgrammingLanguage
): string {
  switch (programmingLanguage) {
    case XcodeCodeSnippetProgrammingLanguage.swift:
      return "Swift";
    case XcodeCodeSnippetProgrammingLanguage.objc:
      return "Objective-C";
  }
}
