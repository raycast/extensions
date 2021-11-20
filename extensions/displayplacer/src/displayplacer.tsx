import {
  ActionPanel,
  ActionPanelItem,
  clearLocalStorage,
  Detail,
  Form,
  FormTextField,
  getLocalStorageItem,
  Icon,
  List,
  ListItem,
  PushAction,
  setLocalStorageItem,
  SubmitFormAction,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import ClearLocalStorage from "./components/clearLocalStorage";
import NotInstalled from "./components/not-installed";
import { listScreenInfo, switchSettings } from "./utils/displayplacer";

export default function DisplayPlacer() {
  const { push, pop } = useNavigation();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCommand, setCurrentCommand] = useState<DisplayPlacerList["currentCommand"]>(null);

  async function init() {
    const myFavs = await getLocalStorageItem("favorites");
    myFavs;
    if (myFavs) {
      setFavorites(JSON.parse(myFavs.toString()));
    } else {
      setFavorites([]);
      await setLocalStorageItem("favorites", "[]");
    }

    const result = await listScreenInfo();

    if (!result.currentCommand) {
      console.error("problem");
      throw new Error("Could not get current command");
    }

    setCurrentCommand(result.currentCommand);

    setIsLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <List isLoading={isLoading}>
      {isLoading || (
        <>
          {favorites?.map((fav, i) => {
            return (
              <ListItem
                title={fav.name}
                key={i}
                icon={currentCommand === fav.command ? Icon.Star : ""}
                actions={
                  <ActionPanel>
                    <ActionPanelItem title="Load Preset" icon={Icon.Desktop} onAction={() => switchSettings(fav)} />
                    <ActionPanelItem title="Edit Preset" icon={Icon.Pencil} onAction={() => console.log("edit")} />
                    <ActionPanelItem title="Delete Preset" icon={Icon.Trash} onAction={() => console.log("trash")} />
                  </ActionPanel>
                }
              />
            );
          })}
          <ListItem
            title="Create New Preset"
            subtitle="using current display settings"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <PushAction
                  title="Create New Preset"
                  target={
                    <Form
                      navigationTitle="New DisplayPlacer Preset"
                      actions={
                        <ActionPanel>
                          <SubmitFormAction
                            onSubmit={async (values: { name: string; subtitle: string }) => {
                              if (favorites) {
                                const result = await listScreenInfo();

                                if (!result.currentCommand) {
                                  console.error("problem");
                                  throw new Error("Could not get current command");
                                }

                                favorites.push({
                                  name: values.name,
                                  subtitle: values.subtitle ?? "",
                                  command: result.currentCommand,
                                });
                                setFavorites(favorites);
                                setLocalStorageItem("favorites", JSON.stringify(favorites));
                                init().then(pop);
                              }
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
                  }
                />
                <PushAction title="Clear All Favorites" target={<ClearLocalStorage onExit={() => init()} />} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}
