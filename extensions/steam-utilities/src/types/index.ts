import { Icon } from "@raycast/api";

/**
 * Common interface for list items in Raycast extensions
 */
export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  accessories?: Array<{
    text?: string;
    icon?: Icon | string;
    tooltip?: string;
  }>;
  icon?: Icon | string;
  keywords?: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

/**
 * Configuration interface for extension settings
 */
export interface ExtensionConfig {
  timeout?: number;
  maxResults?: number;
  enableLogging?: boolean;
}

/**
 * Process information structure (common for Windows extensions)
 */
export interface ProcessInfo {
  pid: number;
  name: string;
  memoryUsage?: number;
  cpuUsage?: number;
  status?: string;
  path?: string;
}

/**
 * File/Directory information structure
 */
export interface FileSystemItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: Date;
  extension?: string;
}
