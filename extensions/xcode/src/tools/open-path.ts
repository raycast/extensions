import { open } from "@raycast/api";

type Input = {
  /**
   * The path which either points to a directory, Xcode Project, Swift Package (Package.swift), Xcode Workspace, Swift Playground or a file.
   */
  path: string;
};

/**
 * Opens a path which either points to a directory, Xcode Project, Swift Package (Package.swift), Xcode Workspace, Swift Playground or a file.
 * @param input The input.
 */
export default (input: Input) => open(input.path);
