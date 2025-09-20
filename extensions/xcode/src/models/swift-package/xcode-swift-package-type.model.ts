/**
 * A Xcode Swift Package Type
 */
export enum XcodeSwiftPackageType {
  /**
   * Library
   */
  library = "library",
  /**
   * Executable
   */
  executable = "executable",
  /**
   * Tool
   */
  tool = "tool",
  /**
   * Build tool plugin
   */
  buildToolPlugin = "build-tool-plugin",
  /**
   * Command tool plugin
   */
  commandPlugin = "command-plugin",
  /**
   * Macro
   */
  macro = "macro",
  /**
   * Empty
   */
  empty = "empty",
}
