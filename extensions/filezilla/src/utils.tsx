import { getApplications, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { XMLParser } from "fast-xml-parser";
import { homedir } from "os";
import { readFile } from "fs/promises";
import { ContentToCheck, Server, Folder, XMLFileContent } from "./types";

/**
 * Checks if FileZilla is installed on the device
 * @returns True if FileZilla is installed, false if it isn't;
 */
export async function isFileZillaInstalled(): Promise<boolean> {
  // I wanted to make custom hook out of it, but for some reason I get
  // TypeError: Cannot read properties of null (reading 'useState') error
  // Hence, I just use this function in every Command component
  try {
    const applications = await getApplications();
    return applications.some(({ bundleId }) => bundleId === "org.filezilla-project.filezilla");
  } catch (error) {
    handleError(error);
    return false;
  }
}

/**
 * Opens FileZilla's site manager
 */
export function openSiteManager(): void {
  // Unfortunatelly FileZilla does not provide a way to change current state of the working app via it's API.
  // Hence we need to reopen the app every time we want to perform some action in FileZilla via Raycast
  exec("(pkill -x filezilla; open /Applications/FileZilla.app --args -s)");
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
  // If empty folder we return nothing
  if (typeof content !== "object") return;

  // If it's a singular server, we just return it in proper form
  if (isServer(content)) {
    modifyServerPath(content, folderPath);
    return content;
  }

  if (isFolder(content)) {
    const serversInFolders = Object.values(content).map((server) =>
      getAvailableServers(server, folderPath ? folderPath + "/" + content["#text"] : content["#text"])
    );
    return ([] as (Server | Folder | undefined)[]).concat(...serversInFolders);
  }

  if (Array.isArray(content)) {
    // If it's array of servers, we just return them in proper form
    if (isServer(content[0])) {
      return ([] as Server[]).concat(...content.map((server) => modifyServerPath(server as Server, folderPath)));
    }

    if (isFolder(content[0])) {
      return ([] as (Server | Folder | undefined)[]).concat(
        ...Object.values(content).map((pieceOfContent: Server | Folder | undefined) => {
          const serversInFolders = Object.values(pieceOfContent as Server | Folder).map((contentToCheck) =>
            getAvailableServers(contentToCheck, (pieceOfContent as Folder)["#text"])
          );

          return ([] as (Server | Folder | undefined)[]).concat(...serversInFolders);
        })
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
      await readFile(homedir() + `/.config/filezilla/${location}.xml`, {
        flag: "r",
      })
    );

    if (typeof xmlFileContent.FileZilla3 !== "string" && !xmlFileContent.FileZilla3)
      throw Error("It seems like you don't have FileZilla version 3. Please install this major version.");

    if (!xmlFileContent.FileZilla3[serversFolder]) return [];

    const siteManager = xmlFileContent.FileZilla3[serversFolder] as XMLFileContent;

    const allServers = Object.values(siteManager).map((content) => getAvailableServers(content as ContentToCheck));

    return ([] as Server[]).concat(...(allServers as Server[])).filter((server) => typeof server !== "undefined");
  } catch (error) {
    handleError(error);
    return [];
  }
}

/**
 * Connects to the specified server
 * @param server Server to which we want to connect
 */
export function connectToTheServer(server: Server): void {
  // Unfortunatelly FileZilla does not provide a way to change connections inside a currently working app via it's API.
  // Hence we need to reopen the app every time we want to perform some action in FileZilla via Raycast
  exec(`(pkill -x filezilla; open /Applications/FileZilla.app --args --site=${server.Path})`);
}
