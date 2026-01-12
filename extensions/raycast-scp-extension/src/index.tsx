/**
 * Main entry point for the Raycast SCP Extension
 *
 * This file serves as the central export point for all commands in the extension.
 * The extension provides two main commands:
 * 1. Upload Files via SCP - Transfer files from local system to remote servers
 * 2. Download Files via SCP - Transfer files from remote servers to local system
 *
 * Both commands integrate with the user's SSH config file (~/.ssh/config) to
 * provide a seamless experience for selecting and connecting to remote servers.
 */

// Export upload command
export { default as upload } from "./upload";

// Export download command
export { default as download } from "./download";
