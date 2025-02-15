import { Command, CommandGroup } from "./types";

export const searchCommandByKeyword = (keyword: string, groups: CommandGroup[]): CommandGroup[] => {
  if (keyword === undefined || keyword === "") {
    return groups;
  }
  if (groups === undefined || groups.length === 0) {
    return [];
  }
  const keywords = keyword.split(" ");
  const allCommandGroups: CommandGroup[] = [];
  const someCommandGroups: CommandGroup[] = [];
  const notMatchedCommandGroups: CommandGroup[] = [];
  for (const group of groups) {
    if (keywords.every((word) => cleanOrNot(group.key, word))) {
      allCommandGroups.push(group);
    } else if (keywords.some((word) => cleanOrNot(group.key, word))) {
      someCommandGroups.push(group);
    } else {
      notMatchedCommandGroups.push(group);
    }
  }

  const commandGroupWithCommands: CommandGroup[] = [];

  notMatchedCommandGroups.forEach((group) => {
    const listWithAll: Command[] = [];
    const listWithSome: Command[] = [];
    group.commands.forEach((command) => {
      const kbd = `${command.text} ${command.kbd}`;
      if (keywords.every((word) => cleanOrNot(kbd, word))) {
        listWithAll.push(command);
      } else if (keywords.some((word) => cleanOrNot(kbd, word))) {
        listWithSome.push(command);
      }
    });
    commandGroupWithCommands.push({
      key: group.key,
      commands: [...listWithAll, ...listWithSome],
    });
  });

  return [...allCommandGroups, ...someCommandGroups, ...commandGroupWithCommands];
};

const cleanOrNot = (str: string, keyword: string): boolean => {
  if (str === undefined || str === null || str === "") {
    return false;
  }
  if (keyword === undefined || keyword === null || keyword === "") {
    return true;
  }
  return str.toLowerCase().includes(keyword.toLowerCase());
};

export const formatter = (command: string): string => {
  return command.startsWith(":") ? command.slice(1) : command;
};
