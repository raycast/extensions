import { ActionPanel, Color, Icon, List, showHUD, showToast, Toast, useNavigation, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import ClearLocalStorage from "./components/clearLocalStorage";
import { Favorite } from "./components/favoritesForm";
import NotInstalled from "./components/not-installed";
import Config from "./config";
import { listScreenInfo, switchSettings } from "./utils/displayplacer";
import { useFavorites } from "./utils/use-favorites";

export default function DisplayPlacer() {
  const { push } = useNavigation();
  const { favorites, actions, isLoading: favsLoading } = useFavorites();
  const [loading, setIsLoading] = useState(true);
  const [currentCommand, setCurrentCommand] = useState<DisplayPlacerList["currentCommand"]>(null);
  const [isError, setIsError] = useState(false);

  function init() {
    try {
      const result = listScreenInfo();

      if (!result.currentCommand) {
        console.error("problem");
        throw new Error("Could not get current command");
      }

      setCurrentCommand(result.currentCommand);
    } catch (e) {
      console.error(e);
      setIsError(true);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  const isLoading = loading || favsLoading;

  function newPreset() {
    push(<Favorite />);
  }

  function editPreset(fav: Favorite) {
    push(<Favorite fav={fav} />);
  }

  const NewPresetAction = (
    <Action
      title="New Display Preset"
      icon={Icon.Plus}
      shortcut={{ key: "n", modifiers: ["cmd"] }}
      onAction={newPreset}
    />
  );

  if (isError)
    return (
      <NotInstalled
        onRefresh={() => {
          setIsLoading(true);
          setIsError(false);
          init();
        }}
      />
    );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter Presets">
      {isLoading || (
        <>
          <List.Section title="Presets">
            {favorites?.map((fav, i) => {
              return (
                <List.Item
                  title={fav.name}
                  key={i}
                  subtitle={fav.subtitle}
                  icon={currentCommand === fav.command ? { source: Icon.Dot, tintColor: Color.Blue } : ""}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Load Display Preset"
                        icon={Icon.Desktop}
                        onAction={async () => {
                          const toast = await showToast({
                            style: Toast.Style.Animated,
                            title: "Switching Display Settings...",
                          });
                          await toast.show();
                          try {
                            switchSettings(fav);
                            await init();
                            await toast.hide();
                            await showHUD("Display Preset Loaded");
                          } catch (e) {
                            await init();
                            await toast.hide();
                            showToast({
                              style: Toast.Style.Failure,
                              title: "Error",
                              message: "An unknown error occured while switching to this preset",
                            });
                          }
                        }}
                      />
                      <Action
                        title="Edit Display Preset"
                        icon={Icon.Pencil}
                        shortcut={{ key: "e", modifiers: ["cmd"] }}
                        onAction={() => editPreset(fav)}
                      />
                      <Action
                        title="Delete Display Preset"
                        icon={Icon.Trash}
                        shortcut={{ key: "delete", modifiers: ["cmd"] }}
                        onAction={() => actions.removeAt(i)}
                      />
                      {NewPresetAction}
                    </ActionPanel>
                  }
                  accessories={[
                    {
                      text: `# ${(i + 1).toString()}`,
                    },
                  ]}
                />
              );
            })}
          </List.Section>
          <List.Section title="Config">
            <List.Item
              title="New Display Preset"
              subtitle="using current display settings"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <Action
                    title="New Display Preset"
                    onAction={newPreset}
                    icon={Icon.Plus}
                    shortcut={{ key: "n", modifiers: ["cmd"] }}
                  />
                  <Action.Push title="Clear All Presets" target={<ClearLocalStorage onExit={() => init()} />} />
                </ActionPanel>
              }
            />

            <List.Item
              title="Help"
              icon={Icon.QuestionMark}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.QuestionMark} title="Open Readme" target={<Config />} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
