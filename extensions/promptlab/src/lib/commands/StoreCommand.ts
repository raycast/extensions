import { LocalStorage, Toast, showToast } from "@raycast/api";
import { Command, StoreCommand } from "./types";
import { commandFromStoreCommand } from ".";

/**
 * Installs all commands from the store.
 * @param availableCommands The list of all available store commands.
 * @param setCommands The function to update the list of installed commands.
 * @returns A promise that resolves once all commands are installed.
 */
export const installAllCommands = async (
  availableCommands: StoreCommand[],
  setCommands: (commands: Command[]) => void,
) => {
  const successes: string[] = [];
  const failures: string[] = [];
  const toast = await showToast({ title: "Installing Commands...", style: Toast.Style.Animated });

  for (const command of availableCommands) {
    const newCommand = await commandFromStoreCommand(command);
    if (newCommand == undefined) {
      failures.push(command.name);
      continue;
    }
    await LocalStorage.setItem(newCommand.name, JSON.stringify(newCommand));
    successes.push(command.name);

    const allCommands = await LocalStorage.allItems();
    const filteredCommands = Object.values(allCommands).filter(
      (cmd, index) =>
        Object.keys(allCommands)[index] != "--defaults-installed" && !Object.keys(allCommands)[index].startsWith("id-"),
    );
    setCommands(filteredCommands.map((data) => JSON.parse(data)));
  }

  if (successes.length > 0 && failures.length == 0) {
    toast.title = `Installed ${successes.length} Command${successes.length == 1 ? "" : "s"}`;
    toast.style = Toast.Style.Success;
  } else if (successes.length > 0 && failures.length > 0) {
    toast.title = `Installed ${successes.length} Command${successes.length == 1 ? "" : "s"}`;
    toast.message = `Failed to install ${failures.length} command${failures.length == 1 ? "" : "s"}: ${failures.join(
      ", ",
    )}`;
    toast.style = Toast.Style.Success;
  } else if (failures.length > 0) {
    toast.title = `Failed To Install ${failures.length} Command${failures.length == 1 ? "" : "s"}`;
    toast.message = failures.join(", ");
    toast.style = Toast.Style.Failure;
  }
};
