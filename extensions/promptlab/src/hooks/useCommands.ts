import { useEffect, useState } from "react";
import { Command } from "../lib/commands/types";
import { installDefaults } from "../lib/files/file-utils";
import { loadCommands } from "../lib/commands";
import { CommandCategory } from "../lib/commands/types";

/**
 * Returns a stateful list of commands.
 * @returns An object containing the list of commands, a function to set the list of commands, and some utility functions.
 */
export function useCommands() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.resolve(installDefaults()).then(() => {
      setIsLoading(true);
      Promise.resolve(loadCommands()).then((newCommands) => {
        setCommands(newCommands);
        setIsLoading(false);
      });
    });
  }, []);

  const revalidate = async () => {
    setIsLoading(true);
    const updatedCommandList = await loadCommands();
    setCommands(updatedCommandList);
    setIsLoading(false);
  };

  const updateCommandList = (newCommands: Command[]) => {
    setCommands(newCommands);
  };

  const commandsMatchingCategory = (category: string | CommandCategory) => {
    const categoryName = typeof category === "string" ? category : category.name;
    return commands?.filter((command) => command.categories?.includes(categoryName) || categoryName == "All") || [];
  };

  return {
    /**
     * The list of commands.
     */
    commands,

    /**
     * Force-sets the list of commands. Use with caution.
     */
    setCommands: updateCommandList,

    /**
     * True if the commands are still loading, false otherwise.
     */
    isLoading,

    /**
     * Revalidates the list of commands.
     * @returns A promise that resolves onces the commands are revalidated.
     */
    revalidate,

    /**
     * The list of command names.
     */
    commandNames: commands.map((command) => command.name),

    /**
     * The list of favorited commands.
     */
    favoritedCommands: commands.filter((command) => command.favorited),

    /**
     * The list of unfavorited commands.
     */
    unfavoritedCommands: commands.filter((command) => !command.favorited),

    /**
     * Returns a list of commands that match the given category. If the category is "All", returns all commands.
     * @param category The category to filter by.
     */
    commandsMatchingCategory,
  };
}
