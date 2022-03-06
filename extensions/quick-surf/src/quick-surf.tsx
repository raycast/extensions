import {
  List,
  ActionPanel,
  Action,
  Application,
  open,
  showHUD,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { urlBuilder, fetchSelectedItem, ItemInput, ItemType, assembleInputItem } from "./utils";
import { GOOGLE_SEARCH, BING_SEARCH, BAIDU_SEARCH, DUCKDUCKGO_SEARCH } from "./constants";
import ApplicationsList from "./surfbrowser";

interface Preferences {
  engine: string;
}

//main view
export default function SurfWithSpecificBrowser() {
  const [browser, setBrowser] = useState<Application[]>([]);
  const [itemInput, setItemInput] = useState<ItemInput>({ type: ItemType.NULL, content: "" });
  const [toSurfBrowser, setToSurfBrowser] = useState<number>(0);

  useEffect(() => {
    async function fetchSelectedText() {
      setItemInput(await fetchSelectedItem());
    }

    fetchSelectedText();
  }, []);

  useEffect(() => {
    async function fetchBrowsers() {
      const entries = Object.entries(await LocalStorage.allItems());
      const browsers = [];
      for (const [key, value] of entries) {
        browsers.push({ bundleId: "", name: key, path: value + "" });
      }
      browsers.sort(function compare(a: Application, b: Application) {
        const bandA = a.name.toUpperCase();
        const bandB = b.name.toUpperCase();
        return bandA > bandB ? 1 : -1;
      });
      setBrowser(browsers);
    }

    fetchBrowsers();
  }, [toSurfBrowser]);

  return (
    <List
      isLoading={browser.length === 0}
      searchBarPlaceholder={"Surf anything with..."}
      selectedItemId={(function () {
        if (browser.length === 0) {
          return "GetBrowser";
        }
        return browser[0].name;
      })()}
      onSearchTextChange={(input) => {
        setItemInput(assembleInputItem(input));
      }}
    >
      <List.Section title={"Type: " + itemInput.type}>
        <List.Item
          id=""
          title={itemInput.content}
          icon={Icon.Text}
          accessoryTitle={"WordCount  " + itemInput.content.length}
          actions={
            <ActionPanel>
              <Action
                title={(function (input: ItemInput) {
                  switch (input.type) {
                    case ItemType.TEXT: {
                      return "Search with Default Browser";
                    }
                    case ItemType.URL: {
                      return "Open with Browser";
                    }
                    case ItemType.NULL: {
                      return "Detect";
                    }
                  }
                })(itemInput)}
                icon={(function (input: ItemInput) {
                  switch (input.type) {
                    case ItemType.TEXT:
                      return Icon.MagnifyingGlass;
                    case ItemType.URL:
                      return Icon.Link;
                    case ItemType.NULL:
                      return Icon.Binoculars;
                  }
                })(itemInput)}
                onAction={async () => {
                  if (itemInput.type == ItemType.NULL) {
                    setItemInput(await fetchSelectedItem());
                  } else {
                    showHUD("Surf with default browser!");
                    open(searchEngineURLBuilder(itemInput.content));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Surf Browser">
        {browser.map((application, index) => {
          return (
            <ApplicationsListItem
              key={application.path}
              index={index}
              inputText={itemInput}
              application={application}
            />
          );
        })}
      </List.Section>

      <GetBrowser key={"GetBrowser"} applications={browser} setToSurfBrowser={setToSurfBrowser} />
    </List>
  );
}

function GetBrowser(props: { applications: Application[]; setToSurfBrowser: any }) {
  const applications = props.applications;
  const setToSurfBrowser = props.setToSurfBrowser;
  const { push } = useNavigation();
  return (
    <List.Item
      id="GetBrowser"
      title={(function (length: number) {
        if (length == 0) {
          return "Get Browser";
        } else {
          return "More Browsers";
        }
      })(applications.length)}
      icon={{ source: { light: "quick-surf.png", dark: "quick-surf@dark.png" } }}
      // accessoryTitle={"❯"}
      accessoryIcon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Game controls">
          <Action
            title="Get More Browser"
            icon={Icon.Gear}
            onAction={() => {
              push(<ApplicationsList setToSurfBrowser={setToSurfBrowser} />);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

//list item
function ApplicationsListItem(props: { index: number; inputText: ItemInput; application: Application }) {
  const index = props.index;
  const inputText = props.inputText;
  const application = props.application;

  return (
    <List.Item
      id={application.name}
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      accessoryTitle={(function (index: number): string {
        return "⌘ " + (index + 2);
      })(index)}
      actions={
        <ActionPanel>
          <Action
            title={(function (input: ItemInput): string {
              let action = "";
              switch (input.type) {
                case ItemType.TEXT:
                  action = "Search with ";
                  break;
                case ItemType.URL:
                  action = "Open with ";
                  break;
                case ItemType.NULL:
                  action = "";
                  break;
              }
              return action + application.name;
            })(inputText)}
            icon={(function (input: ItemInput) {
              switch (input.type) {
                case ItemType.TEXT:
                  return Icon.MagnifyingGlass;
                case ItemType.URL:
                  return Icon.Link;
                case ItemType.NULL:
                  return Icon.Window;
              }
            })(inputText)}
            onAction={async () => {
              actionOnApplicationItem(inputText, application);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function actionOnApplicationItem(inputText: ItemInput, app: Application) {
  if (inputText.type != ItemType.NULL) {
    if (inputText.type == ItemType.URL) {
      showHUD("Open URL in" + app.name);
    } else {
      const preference = getPreferenceValues<Preferences>();
      showHUD("Search Text in " + Object.values(preference)[0]);
    }
    open(searchEngineURLBuilder(inputText.content), app.path);
  } else {
    showToast(Toast.Style.Failure, "No Text or URL Detected!");
  }
}

function searchEngineURLBuilder(content: string): string {
  const preference = getPreferenceValues<Preferences>();
  switch (Object.values(preference)[0]) {
    case "Google": {
      return urlBuilder(GOOGLE_SEARCH, content);
    }
    case "Bing": {
      return urlBuilder(BING_SEARCH, content);
    }
    case "Baidu": {
      return urlBuilder(BAIDU_SEARCH, content);
    }
    case "DuckDuckGo": {
      return urlBuilder(DUCKDUCKGO_SEARCH, content);
    }
  }
  return urlBuilder(GOOGLE_SEARCH, content);
}
