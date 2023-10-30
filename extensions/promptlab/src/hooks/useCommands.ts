import { useEffect, useState } from "react";
import { Command } from "../utils/types";
import { Color, Icon, LocalStorage } from "@raycast/api";
import { installDefaults } from "../utils/file-utils";
import crypto from "crypto";

export function useCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [commandNames, setCommandNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  const loadCommands = async () => {
    // Get the command settings
    setIsLoading(true);
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
    setCommands(newCommands);

    // Get the command names
    const commandNames = Object.keys(items).filter((key) => !key.startsWith("--") && !key.startsWith("id-"));
    setCommandNames(commandNames);
    setIsLoading(false);
  };

  useEffect(() => {
    Promise.resolve(installDefaults()).then(() => {
      Promise.resolve(loadCommands());
    });
  }, []);

  const revalidate = async () => {
    return loadCommands();
  };

  const updateCommand = async (command: Command, newData: Command) => {
    if (command.name !== newData.name) {
      await LocalStorage.removeItem(command.name);
    }
    await LocalStorage.setItem(newData.name, JSON.stringify(newData));
  };

  const deleteCommand = async (command: Command) => {
    await LocalStorage.removeItem(command.name);
  };

  const dummyCommand = (): Command => {
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
    };
  };

  const createCommand = async (newData: Command & { [key: string]: string | boolean }) => {
    // Check if the name is empty
    if (!newData.name) {
      setError("Name cannot be empty.");
      return false;
    }

    // Check if a command with that name already exists
    if (commands.find((command) => command.name == newData.name)) {
      setError("A command with that name already exists.");
      return false;
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
    };

    // Save the command
    await LocalStorage.setItem(newData.name, JSON.stringify(newCommand));
    return newCommand;
  };

  const favorites = () => {
    return commands.filter((command) => command.favorited);
  };

  return {
    commands: commands,
    setCommands: setCommands,
    commandNames: commandNames,
    isLoading: isLoading,
    error: error,
    revalidate: revalidate,
    updateCommand: updateCommand,
    deleteCommand: deleteCommand,
    createCommand: createCommand,
    favorites: favorites,
    dummyCommand: dummyCommand,
  };
}
