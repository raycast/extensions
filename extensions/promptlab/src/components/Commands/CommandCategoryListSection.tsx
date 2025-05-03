import { List } from "@raycast/api";
import { Command } from "../../lib/commands/types";
import { AdvancedSettings } from "../../data/default-advanced-settings";
import { CommandCategory } from "../../lib/commands/types";
import CommandListItem from "./CommandListItem";

type CommandCategoryListSectionProps = {
  /**
   * The command category to display.
   */
  category: CommandCategory;

  /**
   * The list of commands in the category.
   */
  commands: Command[];

  /**
   * The function to update the list of commands.
   * @param commands The new list of commands.
   */
  setCommands: (commands: Command[]) => void;

  /**
   * The user's advanced settings.
   */
  settings: AdvancedSettings;
};

export default function CommandCategoryListSection(props: CommandCategoryListSectionProps) {
  const { category, commands, setCommands, settings } = props;

  return (
    <List.Section title={category.name} key={category.name}>
      {commands.map((command) => (
        <CommandListItem
          command={command}
          previousCommand={""}
          commands={commands}
          setCommands={setCommands}
          settings={settings}
        />
      ))}
    </List.Section>
  );
}
