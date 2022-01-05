import {
  ActionPanel,
  ActionPanelItem,
  Color,
  Form,
  FormCheckbox,
  FormTextField,
  getLocalStorageItem,
  Icon,
  List,
  ListItem,
  PushAction,
  randomId,
  setLocalStorageItem,
  showHUD,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ClearLocalStorage from "./components/clearLocalStorage";
import Help from "./components/help";
import NotInstalled from "./components/not-installed";
import { listScreenInfo, switchSettings } from "./utils/displayplacer";

export default function DisplayPlacer() {
  const { push, pop } = useNavigation();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCommand, setCurrentCommand] = useState<DisplayPlacerList["currentCommand"]>(null);
  const [isError, setIsError] = useState(false);

  async function init() {
    const myFavs = await getLocalStorageItem("favorites");
    myFavs;
    if (myFavs) {
      setFavorites(JSON.parse(myFavs.toString()));
    } else {
      setFavorites([]);
      await setLocalStorageItem("favorites", "[]");
    }

    try {
      const result = await listScreenInfo();

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

  async function getCommandForCurrentSettings() {
    const result = await listScreenInfo();

    if (!result.currentCommand) {
      showToast(ToastStyle.Failure, "Could not get current display settings");
      return null;
    }

    return result.currentCommand;
  }

  function newPreset() {
    push(
      <Form
        navigationTitle="New DisplayPlacer Preset"
        actions={
          <ActionPanel>
            <SubmitFormAction
              title="New Preset"
              icon={Icon.Plus}
              onSubmit={async (values: { name: string; subtitle: string }) => {
                const command = await getCommandForCurrentSettings();
                if (!command) return;

                favorites.push({
                  id: randomId(),
                  name: values.name,
                  subtitle: values.subtitle ?? "",
                  command,
                });
                setFavorites(favorites);
                setLocalStorageItem("favorites", JSON.stringify(favorites));
                init().then(pop);
              }}
            />
          </ActionPanel>
        }
      >
        <FormTextField title="Preset Name" key="name" id="name" />
        <FormTextField
          title="Subtitle"
          placeholder="Short description shown next to title"
          defaultValue=""
          key="subtitle"
          id="subtitle"
        />
      </Form>
    );
  }

  function editPreset(fav: Favorite) {
    push(
      <Form
        navigationTitle="Edit DisplayPlacer Preset"
        actions={
          <ActionPanel>
            <SubmitFormAction
              title="Save Changes"
              icon={Icon.Document}
              onSubmit={async (values: { name: string; subtitle: string; overwrite: boolean }) => {
                const command = await getCommandForCurrentSettings();
                if (!command) return;

                const i = favorites.findIndex((f) => f.id === fav.id);

                favorites[i] = {
                  ...favorites[i],
                  name: values.name,
                  subtitle: values.subtitle ?? "",
                  command: values.overwrite ? command : favorites[i].command,
                };

                setFavorites(favorites);
                setLocalStorageItem("favorites", JSON.stringify(favorites));
                init().then(pop);
              }}
            />
          </ActionPanel>
        }
      >
        <FormTextField title="Preset Name" key="name" id="name" defaultValue={fav.name} />
        <FormTextField
          title="Subtitle"
          placeholder="Short description shown next to title"
          defaultValue={fav.subtitle}
          key="subtitle"
          id="subtitle"
        />
        <FormCheckbox label="Overwrite saved display settings with current display settings" id="overwrite" />
      </Form>
    );
  }

  const NewPresetAction = (
    <ActionPanelItem
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
                <ListItem
                  title={fav.name}
                  key={i}
                  subtitle={fav.subtitle}
                  accessoryTitle={`# ${(i + 1).toString()}`}
                  icon={currentCommand === fav.command ? { source: Icon.Dot, tintColor: Color.Blue } : ""}
                  actions={
                    <ActionPanel>
                      <ActionPanelItem
                        title="Load Display Preset"
                        icon={Icon.Desktop}
                        onAction={async () => {
                          const toast = new Toast({
                            style: ToastStyle.Animated,
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
                            showToast(
                              ToastStyle.Failure,
                              "Error",
                              "An unknown error occured while switching to this preset"
                            );
                          }
                        }}
                      />
                      <ActionPanelItem
                        title="Edit Display Preset"
                        icon={Icon.Pencil}
                        shortcut={{ key: "e", modifiers: ["cmd"] }}
                        onAction={() => editPreset(fav)}
                      />
                      <ActionPanelItem
                        title="Delete Display Preset"
                        icon={Icon.Trash}
                        shortcut={{ key: "delete", modifiers: ["cmd"] }}
                        onAction={() => {
                          const i = favorites.findIndex((f) => f.id === fav.id);

                          favorites.splice(i, 1);

                          setFavorites(favorites);
                          setLocalStorageItem("favorites", JSON.stringify(favorites));
                          init();
                        }}
                      />
                      {NewPresetAction}
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
          <List.Section title="Config">
            <ListItem
              title="New Display Preset"
              subtitle="using current display settings"
              icon={Icon.Plus}
              actions={
                <ActionPanel>
                  <ActionPanelItem
                    title="New Display Preset"
                    onAction={newPreset}
                    icon={Icon.Plus}
                    shortcut={{ key: "n", modifiers: ["cmd"] }}
                  />
                  <PushAction title="Clear All Presets" target={<ClearLocalStorage onExit={() => init()} />} />
                </ActionPanel>
              }
            />

            <ListItem
              title="Help"
              icon={Icon.QuestionMark}
              actions={
                <ActionPanel>
                  <PushAction icon={Icon.QuestionMark} title="Open Readme" target={<Help />} />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
}
