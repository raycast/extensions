import { showToast, Toast } from "@raycast/api";
import { exec, execSync } from "child_process";
import { XMLParser } from "fast-xml-parser";
import { readFile, access } from "fs/promises";
import { accessSync } from "fs";
import { homedir, platform } from "os";
import { ContentToCheck, Server, Folder, XMLFileContent } from "./types";

const IS_WINDOWS = platform() === "win32";

function getFileZillaPath(): string {
  if (IS_WINDOWS) {
    const commonPaths = [
      "C:\\Program Files\\FileZilla FTP Client\\filezilla.exe",
      "C:\\Program Files (x86)\\FileZilla FTP Client\\filezilla.exe",
    ];

    for (const path of commonPaths) {
      try {
        accessSync(path);
        return path;
      } catch {
        continue;
      }
    }

    try {
      return execSync("where filezilla", { encoding: "utf8" }).trim().split("\n")[0];
    } catch {
      return commonPaths[0];
    }
  } else {
    return "/Applications/FileZilla.app";
  }
}

const FILEZILLA_EXE = getFileZillaPath();

const FILEZILLA_CONFIG = IS_WINDOWS ? `${homedir()}\\AppData\\Roaming\\FileZilla` : `${homedir()}/.config/filezilla`;

const CONFIG_SEP = IS_WINDOWS ? "\\" : "/";

/**
 * Checks if FileZilla is installed on the device
 * @returns True if FileZilla is installed, false if it isn't;
 */
export async function isFileZillaInstalled(): Promise<boolean> {
  try {
    await access(FILEZILLA_EXE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens FileZilla's site manager
 */
export function openSiteManager(): void {
  if (IS_WINDOWS) {
    exec(`taskkill /IM filezilla.exe /F & start "" "${FILEZILLA_EXE}" -s`);
  } else {
    exec("(pkill -x filezilla; open /Applications/FileZilla.app --args -s)");
  }
}

/**
 * Shows notification to the user with proper error message
 * @param error Variable in which we can find error message
 */
export function handleError(error: unknown): void {
  let errorMessage = "Unknown error";

  if (typeof error === "string") {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  showToast({ title: "Failed to load saved servers", message: errorMessage, style: Toast.Style.Failure });
}

/**
 * Takes the server and the folder in which it is, and modifies Path property accordingly. Then Path is used to open FileZilla with chosen server connected.
 * @param server Server to modify Path parameter in.
 * @param folderPath Path to the folder where server currently is.
 * @returns Server object with Path parameter modified
 */
function modifyServerPath(server: Server, folderPath?: string): Server {
  try {
    if (folderPath) {
      server.Path = "0/" + folderPath + "/" + server.Name;
    } else {
      server.Path = "0/" + server.Name;
    }

    return server;
  } catch (error) {
    handleError(error);
    return server;
  }
}

/**
 * Type Guard for Folder interface
 * @param contentToCheck Variable to check type of
 * @returns True or false, depending if content is a Folder
 */
function isFolder(contentToCheck: ContentToCheck): contentToCheck is Folder {
  return !!(contentToCheck as Folder)?.["#text"];
}

/**
 * Type Guard for Server interface
 * @param contentToCheck Variable to check type of
 * @returns True or false, depending if content is a Server
 */
function isServer(contentToCheck: ContentToCheck): contentToCheck is Server {
  return !!(contentToCheck as Server)?.Host;
}

/**
 * Gets server out of complex FileZilla XML structure.
 * @param content Object or array our of which extract server
 * @param folderPath Path to the folder where server currently is.
 * @returns After going through recurrency, should return Servers or arrays of them
 */
function getAvailableServers(content: ContentToCheck, folderPath?: string): ContentToCheck {
  if (typeof content !== "object") return;

  if (isServer(content)) {
    modifyServerPath(content, folderPath);
    return content;
  }

  if (isFolder(content)) {
    const serversInFolders = Object.values(content).map((server) =>
      getAvailableServers(server, folderPath ? folderPath + "/" + content["#text"] : content["#text"]),
    );
    return ([] as (Server | Folder | undefined)[]).concat(...serversInFolders);
  }

  if (Array.isArray(content)) {
    if (isServer(content[0])) {
      return ([] as Server[]).concat(...content.map((server) => modifyServerPath(server as Server, folderPath)));
    }

    if (isFolder(content[0])) {
      return ([] as (Server | Folder | undefined)[]).concat(
        ...Object.values(content).map((pieceOfContent: Server | Folder | undefined) => {
          const serversInFolders = Object.values(pieceOfContent as Server | Folder).map((contentToCheck) =>
            getAvailableServers(contentToCheck, (pieceOfContent as Folder)["#text"]),
          );

          return ([] as (Server | Folder | undefined)[]).concat(...serversInFolders);
        }),
      );
    }
  }
}

/**
 * Gets servers out of FileZilla XML files
 * @param location Location of the servers. Available options are either site manager or recent servers.
 * @returns All available saved servers
 */
export async function getServers(location: "sitemanager" | "recentservers"): Promise<Server[]> {
  try {
    const serversFolder = location === "sitemanager" ? "Servers" : "RecentServers";
    const parser = new XMLParser();
    const xmlFileContent = parser.parse(
      await readFile(`${FILEZILLA_CONFIG}${CONFIG_SEP}${location}.xml`, {
        flag: "r",
      }),
    );

    if (typeof xmlFileContent.FileZilla3 !== "string" && !xmlFileContent.FileZilla3)
      throw Error("It seems like you don't have FileZilla version 3. Please install this major version.");

    if (!xmlFileContent.FileZilla3[serversFolder]) return [];

    const siteManager = xmlFileContent.FileZilla3[serversFolder] as XMLFileContent;

    const allServers = Object.values(siteManager).map((content) => getAvailableServers(content as ContentToCheck));

    return ([] as Server[]).concat(...(allServers as Server[])).filter((server) => typeof server !== "undefined");
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return [];
    }
    handleError(error);
    return [];
  }
}

/**
 * Connects to the specified server
 * @param server Server to which we want to connect
 */
export function connectToTheServer(server: Server): void {
  if (IS_WINDOWS) {
    exec(`taskkill /IM filezilla.exe /F & start "" "${FILEZILLA_EXE}" --site=${server.Path}`);
  } else {
    exec(`(pkill -x filezilla; open /Applications/FileZilla.app --args --site=${server.Path})`);
  }
}
