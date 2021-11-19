import {
  ActionPanel,
  ActionPanelItem,
  clearLocalStorage,
  Form,
  FormTextField,
  getLocalStorageItem,
  Icon,
  List,
  ListItem,
  setLocalStorageItem,
  SubmitFormAction,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import NotInstalled from "./components/not-installed";
import { listScreenInfo } from "./utils/list";

type Favorite = {
  name: string;
  command?: string;
};

export default function DisplayPlacer() {
  const { push, pop } = useNavigation();
  const [favorites, setFavorites] = useState<Favorite[] | undefined>(undefined);
  async function init() {
    const myFavs = await getLocalStorageItem("favorites");
    console.log;
    myFavs;
    if (myFavs) {
      setFavorites(JSON.parse(myFavs.toString()));
    } else {
      setFavorites([]);
      await setLocalStorageItem("favorites", "[]");
    }
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <List isLoading={favorites === undefined}>
      {favorites?.map((fav) => {
        <ListItem title={fav.name} />;
      })}
      <ListItem
        title="Create New Preset"
        subtitle="using current display settings"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <ActionPanelItem
              title="Create New Preset"
              onAction={() => {
                push(
                  <Form
                    navigationTitle="New DisplayPlacer Preset"
                    actions={
                      <ActionPanel>
                        <SubmitFormAction
                          onSubmit={(values: { name: string }) => {
                            if (favorites) {
                              favorites.push({ name: values.name });
                              setFavorites(favorites);
                              setLocalStorageItem("favorites", JSON.stringify(favorites));
                              // console.log({ favorites });
                              // init().then(pop);
                              pop();
                            }
                          }}
                        />
                      </ActionPanel>
                    }
                  >
                    <FormTextField title="Preset Name" key="name" id="name" />
                  </Form>
                );
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
