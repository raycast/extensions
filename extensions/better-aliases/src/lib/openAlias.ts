import { Action, type Keyboard } from "@raycast/api";
import React from "react";
import { expandPath, extractPathFromOpenCommand, isOpenCommand } from "./expandPath";

/**
 * Checks if a string looks like a valid file path
 * Returns false if it contains invalid path characters or is clearly not a path
 */
function isValidFilePath(value: string): boolean {
  // Reject paths with certain characters that are invalid in filenames
  // or that indicate it's random snippet content
  const invalidPatterns = [
    /;;/, // Snippet separator
    /^\s*$/, // Empty/whitespace only
  ];

  return !invalidPatterns.some((pattern) => pattern.test(value));
}

/**
 * Creates the appropriate Raycast Action for opening an alias value
 * Handles URLs, "open" commands, and regular paths with environment variable expansion
 * @param value - The alias value to open
 * @param title - The title for the action (default: "Open")
 * @param shortcut - The keyboard shortcut for the action
 * @returns A Raycast Action component or null if the action cannot be created
 */
export function createOpenAction(
  value: string,
  title: string = "Open",
  shortcut?: Keyboard.Shortcut,
  onOpen?: () => void,
): React.ReactElement | null {
  // Handle different types of values
  if (value.includes("://")) {
    // URLs - use Action.Open
    return React.createElement(Action.Open, {
      target: value,
      title: title,
      shortcut: shortcut,
      onOpen: onOpen,
    });
  } else if (isOpenCommand(value)) {
    // "open" commands - extract and expand the path
    const pathFromCommand = extractPathFromOpenCommand(value);
    if (!isValidFilePath(pathFromCommand)) {
      return null;
    }
    const expandedPath = expandPath(pathFromCommand);
    return React.createElement(Action.OpenWith, {
      path: expandedPath,
      title: "Open with",
      shortcut: shortcut,
      onOpen: onOpen,
    });
  } else if (isValidFilePath(value)) {
    // Regular paths - expand environment variables (only if valid path)
    const expandedPath = expandPath(value);
    return React.createElement(Action.OpenWith, {
      path: expandedPath,
      title: "Open with",
      shortcut: shortcut,
      onOpen: onOpen,
    });
  }

  // Return null if value is not a valid path/URL
  return null;
}

/**
 * Gets the target path/URL for opening an alias value
 * Handles path expansion for "open" commands and regular paths
 * @param value - The alias value
 * @returns The target path/URL to open
 */
export function getOpenTarget(value: string): string {
  if (value.includes("://")) {
    // URLs - return as-is
    return value;
  } else if (isOpenCommand(value)) {
    // "open" commands - extract path and expand it
    const pathFromCommand = extractPathFromOpenCommand(value);
    return expandPath(pathFromCommand);
  } else {
    // Regular paths - expand environment variables
    return expandPath(value);
  }
}
