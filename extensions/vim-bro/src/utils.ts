import { Command, CommandGroup } from "./types";

export const searchKeywordInCommandGroups = (keyword: string, commandGroups: CommandGroup[]): CommandGroup[] => {
  if (keyword === "" || keyword === undefined) {
    return commandGroups;
  }

  if (commandGroups === undefined || commandGroups.length === 0) {
    return [];
  }

  const keywordsArr = keyword.split(" ");
  const commandGroupWithAllKeywordsInKey: CommandGroup[] = [];
  const commandGroupWithSomeKeywordsInKey: CommandGroup[] = [];
  const notMatchedCommandGroups: CommandGroup[] = [];
  for (const commandGroup of commandGroups) {
    if (keywordsArr.every((word) => includesCaseInsensitive(commandGroup.key, word))) {
      commandGroupWithAllKeywordsInKey.push(commandGroup);
    } else if (keywordsArr.some((word) => includesCaseInsensitive(commandGroup.key, word))) {
      commandGroupWithSomeKeywordsInKey.push(commandGroup);
    } else {
      notMatchedCommandGroups.push(commandGroup);
    }
  }

  const commandGroupWithKeywordsInCommands: CommandGroup[] = [];

  notMatchedCommandGroups.forEach((group: CommandGroup) => {
    const listWithAll: Command[] = [];
    const listWithSome: Command[] = [];
    group.commands.forEach((item: Command) => {
      const textAndKbd = `${item.text} ${item.kbd}`;
      if (keywordsArr.every((word) => includesCaseInsensitive(textAndKbd, word))) {
        listWithAll.push(item);
      } else if (keywordsArr.some((word) => includesCaseInsensitive(textAndKbd, word))) {
        listWithSome.push(item);
      }
    });

    commandGroupWithKeywordsInCommands.push({ key: group.key, commands: [...listWithAll, ...listWithSome] });
  });

  return [
    ...commandGroupWithAllKeywordsInKey,
    ...commandGroupWithSomeKeywordsInKey,
    ...commandGroupWithKeywordsInCommands,
  ];
};

const includesCaseInsensitive = (str: string, keyword: string): boolean => {
  if (str === undefined || str === null || str === "") {
    return false;
  }

  if (keyword === undefined || keyword === null || keyword === "") {
    return true;
  }

  return str.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
};

export const formatCommandForClipboard = (command: string): string => {
  return command.startsWith(":") ? command.slice(1) : command;
};
