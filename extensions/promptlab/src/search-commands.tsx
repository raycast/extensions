import { getPreferenceValues, List } from "@raycast/api";
import { useEffect, useState } from "react";
import CommandResponse from "./components/Commands/CommandResponse";
import { ExtensionPreferences, searchPreferences } from "./lib/preferences/types";
import CategoryDropdown from "./components/CategoryDropdown";
import { useCommands } from "./hooks/useCommands";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";
import { useCachedState } from "@raycast/utils";
import { COMMAND_CATEGORIES } from "./lib/common/constants";
import CommandListItem from "./components/Commands/CommandListItem";
import CommandCategoryListSection from "./components/Commands/CommandCategoryListSection";

export default function SearchCommand(props: { arguments: { commandName: string; queryInput: string } }) {
  const { commandName, queryInput } = props.arguments;
  const {
    commands,
    setCommands,
    favoritedCommands,
    unfavoritedCommands,
    commandNames,
    isLoading: loadingCommands,
    commandsMatchingCategory,
  } = useCommands();
  const [previousCommand] = useCachedState<string>("promptlab-previous-command", "");
  const [targetCategory, setTargetCategory] = useState<string>("All");
  const [searchText, setSearchText] = useState<string | undefined>(
    commandName == undefined || queryInput ? undefined : commandName.trim(),
  );
  const { advancedSettings } = useAdvancedSettings();
  const preferences = getPreferenceValues<searchPreferences & ExtensionPreferences>();

  useEffect(() => {
    if (!loadingCommands) {
      if (searchText == undefined && !commandNames.includes(commandName)) {
        setSearchText(commandName);
      }
    }
  }, [loadingCommands]);

  if (commandNames.includes(commandName) || commands.map((cmd) => cmd.id).includes(commandName)) {
    const command = commands.find((cmd) => cmd.id == commandName || cmd.name == commandName);
    if (!command) {
      return null;
    }
    return (
      <CommandResponse
        command={command}
        prompt={command.prompt}
        input={queryInput}
        options={{
          ...command,
          minNumFiles: parseInt(command.minNumFiles || "0"),
          acceptedFileExtensions:
            command.acceptedFileExtensions?.length && command.acceptedFileExtensions !== "None"
              ? command.acceptedFileExtensions?.split(",").map((item) => item.trim())
              : undefined,
        }}
        setCommands={setCommands}
      />
    );
  }

  const shownCommands = commandsMatchingCategory(targetCategory);
  const sortedCommands = shownCommands.sort((a, b) => a.name.localeCompare(b.name));
  const shownCategories = preferences.groupByCategory
    ? COMMAND_CATEGORIES.filter((category) => {
        const commandsInCategory = shownCommands?.filter((command) => {
          return (!command.categories?.length && category.name == "Other") || command.categories?.[0] == category.name;
        });
        return commandsInCategory?.length;
      })
    : [];

  return (
    <List
      isLoading={loadingCommands}
      searchText={loadingCommands ? "" : searchText}
      onSearchTextChange={(text) => setSearchText(text)}
      filtering={true}
      isShowingDetail={!loadingCommands}
      searchBarPlaceholder={`Search ${
        !commands || commands.length == 1
          ? "commands..."
          : `${shownCommands.length} command${shownCommands.length > 1 ? "s" : ""}...`
      }`}
      searchBarAccessory={loadingCommands ? null : <CategoryDropdown onSelection={setTargetCategory} />}
    >
      <List.EmptyView title="No Custom Commands" />
      {favoritedCommands.length && !preferences.groupByCategory ? (
        <List.Section title="Favorites">
          {sortedCommands
            .filter((command) => command.favorited)
            .map((command) => (
              <CommandListItem
                command={command}
                previousCommand={previousCommand}
                commands={commands}
                setCommands={setCommands}
                settings={advancedSettings}
              />
            ))}
        </List.Section>
      ) : null}

      {unfavoritedCommands.length && !preferences.groupByCategory ? (
        <List.Section title={favoritedCommands.length ? `Other Commands` : `All Commands`}>
          {sortedCommands
            .filter((command) => !command.favorited)
            .map((command) => (
              <CommandListItem
                command={command}
                previousCommand={previousCommand}
                commands={commands}
                setCommands={setCommands}
                settings={advancedSettings}
              />
            ))}
        </List.Section>
      ) : null}

      {preferences.groupByCategory
        ? shownCategories.map((category) => {
            const commandsInCategory = commandsMatchingCategory(category);

            // Sort favorite commands to the top of each category
            const sortedCommandsInCategory = commandsInCategory.sort((a, b) => (a.favorited && !b.favorited ? -1 : 1));

            return (
              <CommandCategoryListSection
                category={category}
                commands={sortedCommandsInCategory}
                setCommands={setCommands}
                settings={advancedSettings}
              />
            );
          })
        : null}
    </List>
  );
}
