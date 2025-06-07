import path from "node:path";
import { ForkedExtension } from "./types.js";

export const getActualIconPath = (extension: ForkedExtension) =>
  path.join(extension.folderPath, "assets", extension.icon);

export const userLink = (username: string) => `https://raycast.com/${username}`;

export const extensionLink = (username: string, extension: string) => `https://raycast.com/${username}/${extension}`;
