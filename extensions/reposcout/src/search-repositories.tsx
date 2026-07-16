/**
 * Raycast requires a command entry file named after the command (`name` in
 * package.json). The implementation lives in `commands/` to keep this file a
 * one-line seam. See docs/ARCHITECTURE.md ("Extension lifecycle").
 */
export { default } from "./commands/SearchRepositories";
