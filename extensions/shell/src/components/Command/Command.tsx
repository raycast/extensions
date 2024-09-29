import { closeMainWindow, getPreferenceValues, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useState, type FC } from "react";
import { runInShell } from "./helpers/runInShellFunctions";
import { Result } from "../Result";
import type { Preferences, Props } from "./helpers/types";
import { usePersistentState } from "raycast-toolkit";
import { shellHistory } from "shell-history";
import { getCategories } from "./helpers/command";
import { ActionList } from "./components/ActionList";

const Command: FC<Props> = ({ shellArguments }) => {
  const [cmd, setCmd] = useState<string>("");
  const [history, setHistory] = useState<string[]>();
  const [recentlyUsed, setRecentlyUsed] = usePersistentState<string[]>("recently-used", []);

  const { arguments_terminal_type: terminalType, arguments_terminal: openInTerminal } =
    getPreferenceValues<Preferences>();

  const categories = getCategories(cmd, recentlyUsed, history);

  const addToRecentlyUsed = (command: string) => {
    setRecentlyUsed((prev) => (prev.find((item) => item === command) ? prev : [command, ...prev].slice(0, 10)));
  };

  useEffect(() => {
    setHistory([...new Set(shellHistory().reverse())]);
  }, [setHistory]);

  useEffect(() => {
    if (shellArguments?.command && openInTerminal) {
      addToRecentlyUsed(shellArguments.command);
      showHUD("Ran command in " + terminalType);
      popToRoot();
      closeMainWindow();
      runInShell(terminalType, shellArguments);
    }
  }, [shellArguments]);

  if (shellArguments?.command) {
    if (openInTerminal) {
      return null;
    }
    return <Result command={shellArguments.command} />;
  }

  return (
    <List
      isLoading={history === undefined}
      enableFiltering={false}
      onSearchTextChange={setCmd}
      navigationTitle="Shell command"
      searchBarPlaceholder="Enter shell-command"
    >
      {categories.map((category) => (
        <List.Section title={category.category} key={category.category}>
          {category.items.map((command, index) => (
            <List.Item
              icon={Icon.Terminal}
              title={command}
              key={index}
              actions={<ActionList command={command} addToRecentlyUsed={addToRecentlyUsed} />}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};

export default Command;
