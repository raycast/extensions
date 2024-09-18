import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { StoreCommand } from "./lib/commands/types";
import { useCachedState, useFetch } from "@raycast/utils";
import { STORE_ENDPOINT, STORE_KEY } from "./lib/common/constants";
import CategoryDropdown from "./components/CategoryDropdown";
import { useCommands } from "./hooks/useCommands";
import CommandListDetail from "./components/Commands/CommandListDetail";
import RunCommandAction from "./components/Commands/actions/RunCommandAction";
import { CopyCommandActionsSection } from "./components/Commands/actions/CopyCommandActions";
import { CommandControlsActionsSection } from "./components/Commands/actions/CommandControlActions";
import InstallCommandAction from "./components/Commands/actions/InstallCommandAction";
import { useAdvancedSettings } from "./hooks/useAdvancedSettings";

export default function Discover() {
  const { commands: myCommands, setCommands: setMyCommands, isLoading: loadingMyCommands } = useCommands();
  const [availableCommands, setAvailableCommands] = useCachedState<StoreCommand[]>("availableCommands", []);
  const [targetCategory, setTargetCategory] = useState<string>("All");
  const { advancedSettings } = useAdvancedSettings();

  // Get available commands from store
  const { data, isLoading } = useFetch(STORE_ENDPOINT, { headers: { "X-API-KEY": STORE_KEY } });
  useEffect(() => {
    if (data && !isLoading) {
      setAvailableCommands((data as { data: StoreCommand[] })["data"].reverse());
    }
  }, [data, isLoading]);

  const knownPrompts = myCommands?.map((command) => command.prompt);

  const listItems = availableCommands
    .filter((command) => command.categories?.split(", ").includes(targetCategory) || targetCategory == "All")
    .map((command) => (
      <List.Item
        title={command.name}
        icon={{
          source: command.icon,
          tintColor: command.iconColor == undefined ? Color.PrimaryText : command.iconColor,
        }}
        key={command.name}
        accessories={
          knownPrompts?.includes(command.prompt) ? [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green } }] : []
        }
        detail={<CommandListDetail command={command} />}
        actions={
          <ActionPanel>
            <InstallCommandAction command={command} setCommands={setMyCommands} settings={advancedSettings} />
            {command.setupConfig?.length ? null : <RunCommandAction command={command} settings={advancedSettings} />}
            <CopyCommandActionsSection command={command} settings={advancedSettings} />
            <CommandControlsActionsSection
              command={command}
              availableCommands={availableCommands}
              commands={myCommands}
              setCommands={setMyCommands}
              settings={advancedSettings}
            />
          </ActionPanel>
        }
      />
    ));

  return (
    <List
      isLoading={loadingMyCommands || isLoading}
      isShowingDetail={availableCommands != undefined}
      searchBarPlaceholder="Search PromptLab store..."
      searchBarAccessory={<CategoryDropdown onSelection={setTargetCategory} />}
    >
      <List.EmptyView title="Loading..." icon={{ source: "no-view.png" }} />
      {targetCategory == "All" ? <List.Section title="Newest Commands">{listItems.slice(0, 5)}</List.Section> : null}
      <List.Section title="————————————————————">{listItems.slice(targetCategory == "All" ? 5 : 0)}</List.Section>
    </List>
  );
}
