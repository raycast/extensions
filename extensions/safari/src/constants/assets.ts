import { homedir } from "os";
import path from "path";

export const PLIST_PATH = `${homedir()}/Library/Safari/Bookmarks.plist`;
export const GO_PARSER_PATH = path.join(__dirname, "assets", "bookmarks-parser");
