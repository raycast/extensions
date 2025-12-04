import { Color, Icon, LocalStorage, Toast, showToast } from "@raycast/api";
import crypto from "crypto";
import { Command, PLCommandRunProperties, StoreCommand, isCommand, isStoreCommand } from "./types";
import { isTrueStr } from "../common/types";

/**
 * Loads all commands from local storage.
 * @returns A promise that resolves to an array of commands.
 */
export const loadCommands = async () => {
  // Get the command settings
  const items = await LocalStorage.allItems();

  const commandObjs = Object.entries(items)
    .filter(([key]) => !key.startsWith("--") && !key.startsWith("id-"))
    .map(([, value]) => JSON.parse(value));
  const existingIDs = commandObjs.map((command) => command.id);

  // Ensure that all commands have a unique ID
  const newCommands: Command[] = [];
  for (const command of commandObjs) {
    const newCommand = { ...command };
    if (!command.id || (command.id && command.id.trim().length == 0)) {
      let newID = `CM${crypto.randomUUID()}`;
      while (existingIDs.includes(newID)) {
        newID = `CM${crypto.randomUUID()}`;
      }
      newCommand.id = newID;
    }
    await LocalStorage.setItem(newCommand.name, JSON.stringify(newCommand));
    newCommands.push(newCommand);
  }
  return newCommands;
};

/**
 * Deletes a command from the local storage.
 * @param command The command to delete.
 * @returns A promise that resolves when the command is deleted.
 */
export const deleteCommand = async (command: Command) => {
  await LocalStorage.removeItem(command.name);
};

/**
 * A dummy command with default values. Used for creating new commands.
 * @returns A dummy command instance.
 */
export const dummyCommand = (): Command => {
  return {
    id: `CM${crypto.randomUUID()}`,
    name: "",
    description: "",
    icon: Icon.Gear,
    iconColor: Color.Red,
    favorited: false,
    prompt: "",
    model: "",
    minNumFiles: "0",
    acceptedFileExtensions: "",
    useMetadata: false,
    useSoundClassification: false,
    useAudioDetails: false,
    useSubjectClassification: false,
    useRectangleDetection: false,
    useBarcodeDetection: false,
    useFaceDetection: false,
    useHorizonDetection: false,
    useSaliencyAnalysis: false,
    outputKind: "detail",
    showResponse: true,
    speakResponse: false,
    useSpeech: false,
    showInMenuBar: false,
    actionScript: "",
    scriptKind: "AppleScript",
    setupConfig: undefined,
    installedFromStore: false,
    setupLocked: false,
    temperature: "1.0",
    categories: [],
    author: "",
    website: "",
    version: "1.0.0",
    requirements: "",
    timesExecuted: 0,
    recordRuns: false,
    runs: [],
  };
};

/**
 * Creates a new command.
 * @param newData The data to create the command with.
 * @returns A promise that resolves when the command is created.
 */
export const createCommand = async (newData: Command & { [key: string]: string | boolean }) => {
  const commands = await loadCommands();

  // Check if the name is empty
  if (!newData.name) {
    return "Name cannot be empty.";
  }

  // Check if a command with that name already exists
  if (commands.find((command) => command.name == newData.name)) {
    return "A command with that name already exists.";
  }

  // Create the command object
  const newCommand: Command = {
    id: `CM${crypto.randomUUID()}`,
    name: newData.name,
    description: newData.description || "",
    icon: newData.icon || Icon.Gear,
    iconColor: newData.iconColor || Color.PrimaryText,
    favorited: newData.favorited || false,
    prompt: newData.prompt || "",
    model: newData.model || "",
    minNumFiles: newData.minNumFiles || "0",
    acceptedFileExtensions: newData.acceptedFileExtensions || "",
    useMetadata: newData.useMetadata || false,
    useSoundClassification: newData.useSoundClassification || false,
    useAudioDetails: newData.useAudioDetails || false,
    useSubjectClassification: newData.useSubjectClassification || false,
    useRectangleDetection: newData.useRectangleDetection || false,
    useBarcodeDetection: newData.useBarcodeDetection || false,
    useFaceDetection: newData.useFaceDetection || false,
    useHorizonDetection: newData.useHorizonDetection || false,
    useSaliencyAnalysis: newData.useSaliencyAnalysis || false,
    outputKind: newData.outputKind || "detail",
    showResponse: newData.showResponse || true,
    speakResponse: newData.speakResponse || false,
    useSpeech: newData.useSpeech || false,
    showInMenuBar: newData.showInMenuBar || false,
    actionScript: newData.actionScript || "",
    scriptKind: newData.scriptKind || "AppleScript",
    setupConfig: newData.setupConfig || undefined,
    installedFromStore: newData.installedFromStore || false,
    setupLocked: newData.setupLocked || false,
    temperature: newData.temperature || "1.0",
    categories: newData.categories || [],
    author: newData.author || "",
    website: newData.website || "",
    version: newData.version || "1.0.0",
    requirements: newData.requirements || "",
    timesExecuted: 0,
    recordRuns: false,
    runs: [],
  };

  // Save the command
  await LocalStorage.setItem(newData.name, JSON.stringify(newCommand));
  return newCommand;
};

/**
 * Converts a store command to a command object, adjusting the name if necessary.
 * @param storeCommand The store command to convert.
 * @returns A promise that resolves to a command object, or undefined if an error occurred.
 */
export const commandFromStoreCommand = async (storeCommand: StoreCommand): Promise<Command | undefined> => {
  const commands = await loadCommands();
  const knownCommandNames = commands.map((command) => command.name);
  const knownPrompts = commands.map((command) => command.prompt);

  let cmdName = storeCommand.name;
  if (knownCommandNames?.includes(storeCommand.name)) {
    cmdName = `${storeCommand.name} 2`;
  }

  if (knownPrompts?.includes(storeCommand.prompt)) {
    showToast({ title: "Error", message: `Command already installed`, style: Toast.Style.Failure });
    return undefined;
  }

  const newCommand: Command = {
    name: cmdName,
    prompt: storeCommand.prompt,
    icon: storeCommand.icon,
    iconColor: storeCommand.iconColor,
    minNumFiles: storeCommand.minNumFiles as string,
    acceptedFileExtensions: storeCommand.acceptedFileExtensions == "None" ? "" : storeCommand.acceptedFileExtensions,
    useMetadata: storeCommand.useMetadata == "TRUE" ? true : false,
    useSoundClassification: storeCommand.useSoundClassification == "TRUE" ? true : false,
    useAudioDetails: storeCommand.useAudioDetails == "TRUE" ? true : false,
    useSubjectClassification: storeCommand.useSubjectClassification == "TRUE" ? true : false,
    useRectangleDetection: storeCommand.useRectangleDetection == "TRUE" ? true : false,
    useBarcodeDetection: storeCommand.useBarcodeDetection == "TRUE" ? true : false,
    useFaceDetection: storeCommand.useFaceDetection == "TRUE" ? true : false,
    useHorizonDetection: storeCommand.useHorizonDetection == "TRUE" ? true : false,
    outputKind: storeCommand.outputKind,
    actionScript: storeCommand.actionScript,
    showResponse: storeCommand.showResponse == "TRUE" ? true : false,
    description: storeCommand.description,
    useSaliencyAnalysis: storeCommand.useSaliencyAnalysis == "TRUE" ? true : false,
    author: storeCommand.author,
    website: storeCommand.website,
    version: storeCommand.version,
    requirements: storeCommand.requirements,
    scriptKind: storeCommand.scriptKind,
    categories: storeCommand.categories?.split(", ") || ["Other"],
    temperature: storeCommand.temperature,
    favorited: false,
    setupConfig:
      storeCommand.setupConfig?.length && storeCommand.setupConfig != "None"
        ? JSON.parse(storeCommand.setupConfig)
        : undefined,
    installedFromStore: true,
    setupLocked: true,
    useSpeech: storeCommand.useSpeech == "TRUE" ? true : false,
    speakResponse: storeCommand.speakResponse == "TRUE" ? true : false,
    showInMenuBar: false,
    id: `CM${crypto.randomUUID()}`,
    timesExecuted: 0,
    recordRuns: false,
    runs: [],
  };
  return newCommand;
};

/**
 * Generates data for editing a command.
 * @param oldCommand The command or store command to edit.
 * @param duplicate Whether or not the command is being duplicated.
 * @returns The data for editing the command.
 */
export const commandDataForEditing = (oldCommand: Command | StoreCommand, duplicate = false): Command => {
  const commandData: Command = {
    id: isCommand(oldCommand) ? oldCommand.id : "",
    name: oldCommand.name + (duplicate ? (isCommand(oldCommand) ? " (Copy)" : "") : ""),
    prompt: oldCommand.prompt,
    icon: oldCommand.icon,
    iconColor: oldCommand.iconColor,
    minNumFiles: oldCommand.minNumFiles?.toString(),
    acceptedFileExtensions: oldCommand.acceptedFileExtensions == "None" ? "" : oldCommand.acceptedFileExtensions,
    useMetadata: isTrueStr(oldCommand.useMetadata),
    useAudioDetails: isTrueStr(oldCommand.useAudioDetails),
    useSoundClassification: isTrueStr(oldCommand.useSoundClassification),
    useSubjectClassification: isTrueStr(oldCommand.useSubjectClassification),
    useRectangleDetection: isTrueStr(oldCommand.useRectangleDetection),
    useBarcodeDetection: isTrueStr(oldCommand.useBarcodeDetection),
    useFaceDetection: isTrueStr(oldCommand.useFaceDetection),
    useHorizonDetection: isTrueStr(oldCommand.useHorizonDetection),
    outputKind: oldCommand.outputKind,
    actionScript: oldCommand.actionScript,
    showResponse: isTrueStr(oldCommand.showResponse),
    description: oldCommand.description,
    useSaliencyAnalysis: isTrueStr(oldCommand.useSaliencyAnalysis),
    author: oldCommand.author,
    website: oldCommand.website,
    version: oldCommand.version,
    requirements: oldCommand.requirements,
    scriptKind: oldCommand.scriptKind,
    categories: isStoreCommand(oldCommand)
      ? oldCommand.categories?.split(", ") || ["Other"]
      : oldCommand.categories || [],
    temperature: oldCommand.temperature == undefined || oldCommand.temperature == "" ? "1.0" : oldCommand.temperature,
    favorited: isStoreCommand(oldCommand) ? false : oldCommand.favorited,
    setupConfig: isStoreCommand(oldCommand)
      ? oldCommand.setupConfig?.length && oldCommand.setupConfig != "None"
        ? JSON.parse(oldCommand.setupConfig)
        : undefined
      : oldCommand.setupConfig,
    installedFromStore: isStoreCommand(oldCommand) ? true : oldCommand.installedFromStore,
    setupLocked: isStoreCommand(oldCommand) ? false : oldCommand.setupLocked,
    useSpeech: isTrueStr(oldCommand.useSpeech),
    speakResponse: isTrueStr(oldCommand.speakResponse),
    showInMenuBar: isStoreCommand(oldCommand) ? false : oldCommand.showInMenuBar,
    model: isCommand(oldCommand) ? oldCommand.model : undefined,
    timesExecuted: isCommand(oldCommand) ? oldCommand.timesExecuted : 0,
    recordRuns: isCommand(oldCommand) ? oldCommand.recordRuns : false,
    runs: isCommand(oldCommand) ? oldCommand.runs : [],
  };
  return commandData;
};

export const createCommandRun = (
  command: Command,
  data: {
    prompt: string;
    response: string;
    error?: string;
  },
): PLCommandRunProperties => {
  return {
    id: `CR${crypto.randomUUID()}`,
    index: command.timesExecuted ? command.timesExecuted + 1 : 1,
    commandID: command.id,
    timestamp: new Date().toISOString(),
    prompt: data.prompt,
    response: data.response,
    error: data.error,
  };
};

/**
 * Updates a command with new data.
 * @param oldCommandData The old data object for the command.
 * @param newCommandData The new data object for the command.
 * @param setCommands The function to update the list of commands.
 */
export const updateCommand = async (
  oldCommandData: Command | undefined,
  newCommandData: Command,
  setCommands?: (commands: Command[]) => void,
) => {
  const commandData = await LocalStorage.allItems();
  const commandDataFiltered = Object.values(commandData).filter((cmd, index) => {
    return (
      !Object.keys(commandData)[index].startsWith("--") &&
      !Object.keys(commandData)[index].startsWith("id-") &&
      (oldCommandData == undefined || JSON.parse(cmd).name != oldCommandData.name)
    );
  });

  if (setCommands != undefined) {
    setCommands([...(commandDataFiltered?.map((data) => JSON.parse(data)) || []), newCommandData]);
  }

  if (oldCommandData != undefined && oldCommandData.name != newCommandData.name) {
    await LocalStorage.removeItem(oldCommandData.name);
  }
  await LocalStorage.setItem(newCommandData.name, JSON.stringify(newCommandData));
};

export async function deleteCommandRun(run: PLCommandRunProperties) {
  const commandData = await LocalStorage.allItems();
  const commands = Object.values(commandData)
    .filter((cmd, index) => {
      return !Object.keys(commandData)[index].startsWith("--") && !Object.keys(commandData)[index].startsWith("id-");
    })
    .map((cmd) => JSON.parse(cmd)) as Command[];

  const command = commands.find((cmd) => cmd.id == run.commandID);
  if (command && command.runs) {
    const updatedCommand = {
      ...command,
      runs: command.runs.filter((r) => r.id != run.id),
    };
    await updateCommand(command, updatedCommand);
  }
}
