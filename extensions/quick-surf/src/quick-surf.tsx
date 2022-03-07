import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  open,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  assembleInputItem,
  fetchSelectedItem,
  ItemInput,
  ItemType,
  preferences,
  SurfApplication,
  urlBuilder,
} from "./utils";
import { SEARCH_ENGINE } from "./constants";
import ApplicationsList from "./surfbrowser";

//main view
export default function SurfWithSpecificBrowser() {
  const [browsers, setBrowsers] = useState<SurfApplication[]>([]);
  const [itemInput, setItemInput] = useState<ItemInput>({ type: ItemType.NULL, content: "" });

  useEffect(() => {
    async function fetchSelectedText() {
      setItemInput(await fetchSelectedItem());
    }

    fetchSelectedText();
  }, []);

  useEffect(() => {
    async function fetchSelectedText() {
      const localBrowsers = await LocalStorage.getItem<string>("browsers");
      let _browsers = [];
      if (typeof localBrowsers == "string") {
        _browsers = JSON.parse(localBrowsers);
        setBrowsers(_browsers);
      }
    }

    fetchSelectedText();
  }, [itemInput]);

  return (
    <List
      isLoading={false}
      searchBarPlaceholder={"Surf anything with..."}
      selectedItemId={(function () {
        if (browsers.length === 0) {
          return "GetBrowser";
        }
        return browsers[0].name;
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
                      return "Open with Default Browser";
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
                    const selectedItem = await fetchSelectedItem();
                    if (selectedItem.type == ItemType.NULL) {
                      showToast(Toast.Style.Failure, "No Text or URL Detected!");
                    } else {
                      setItemInput(selectedItem);
                    }
                  } else {
                    await showHUD("Surf with default browser!");
                    await open(searchEngineURLBuilder(itemInput.content));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Surf Browser">
        {browsers.map((browser, index) => {
          return (
            <ApplicationsListItem
              key={browser.path}
              inputText={itemInput}
              setItemInput={setItemInput}
              index={index}
              browsers={browsers}
            />
          );
        })}
      </List.Section>

      <GetBrowser key={"GetBrowser"} setBrowsers={setBrowsers} />
    </List>
  );
}

function GetBrowser(props: { setBrowsers: any }) {
  const setBrowsers = props.setBrowsers;
  const { push } = useNavigation();

  return (
    <List.Item
      id="GetBrowser"
      title={"More Browsers"}
      icon={{ source: { light: "quick-surf.png", dark: "quick-surf@dark.png" } }}
      // accessoryTitle={"❯"}
      accessoryIcon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Game controls">
          <Action
            title="Get More Browser"
            icon={Icon.Gear}
            onAction={() => {
              push(<ApplicationsList setSurfBrowsers={setBrowsers} />);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

//list item
function ApplicationsListItem(props: {
  inputText: ItemInput;
  setItemInput: any;
  index: number;
  browsers: SurfApplication[];
}) {
  const index = props.index;
  const setItemInput = props.setItemInput;
  const inputText = props.inputText;
  const applications = props.browsers;
  const application = applications[index];

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
                  action = "Search with " + application.name;
                  break;
                case ItemType.URL:
                  action = "Open with " + application.name;
                  break;
                case ItemType.NULL:
                  action = "Detect";
                  break;
              }
              return action;
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
              await upBrowserRank(inputText.type, application, applications);
              await actionOnApplicationItem(inputText, setItemInput, application);
            }}
          />
          <Action
            title={"Clear Surf Rank"}
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              await clearBrowserRank(applications);
              await showToast(Toast.Style.Success, "Clear Rank Success!");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

async function actionOnApplicationItem(inputText: ItemInput, setItemInput: any, app: SurfApplication) {
  if (inputText.type != ItemType.NULL) {
    if (inputText.type == ItemType.URL) {
      await showHUD("Open URL with " + app.name);
    } else {
      await showHUD("Search Text by " + preferences().engine);
    }
    await open(searchEngineURLBuilder(inputText.content), app.path);
    await popToRoot({ clearSearchBar: true });
  } else {
    const selectedItem = await fetchSelectedItem();
    if (selectedItem.type == ItemType.NULL) {
      await showToast(Toast.Style.Failure, "No Text or URL Detected!");
    } else {
      setItemInput(selectedItem);
    }
  }
}

function searchEngineURLBuilder(content: string): string {
  switch (preferences().engine) {
    case "Google": {
      return urlBuilder(SEARCH_ENGINE.google, content);
    }
    case "Bing": {
      return urlBuilder(SEARCH_ENGINE.bing, content);
    }
    case "Baidu": {
      return urlBuilder(SEARCH_ENGINE.baidu, content);
    }
    case "DuckDuckGo": {
      return urlBuilder(SEARCH_ENGINE.duckduckgo, content);
    }
  }
  return urlBuilder(SEARCH_ENGINE.google, content);
}

/**
 *
 * Rank increase: Percentage rank
 * The larger the rank, the smaller the increase
 * The smaller the rank, the larger the increase
 *
 * Sort: Localization Principle
 * After searching URL, use URLRank to prioritize
 * After searching Text, use TextRank to prioritize
 */
async function upBrowserRank(itemType: ItemType, browser: SurfApplication, browsers: SurfApplication[]) {
  browsers.map((val, index) => {
    if (val.name == browser.name) {
      switch (itemType) {
        case ItemType.TEXT: {
          let allTextRank = 0;
          browsers.forEach((value) => [(allTextRank = allTextRank + value.rankText)]);
          browsers[index].rankText =
            Math.floor((browsers[index].rankText + 1 - browsers[index].rankText / allTextRank) * 100) / 100;
          browsers.sort(function (a, b) {
            switch (preferences().sort) {
              case "Rank": {
                return (b.rankText - a.rankText) * 0.2 + (b.rankURL - a.rankURL) * 0.8;
              }
              case "Name+": {
                return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
              }
              case "Name-": {
                return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
              }
              default: {
                return (b.rankText - a.rankText) * 0.8 + (b.rankURL - a.rankURL) * 0.2;
              }
            }
          });
          break;
        }
        case ItemType.URL: {
          let allURLRank = 0;
          browsers.forEach((value) => [(allURLRank = allURLRank + value.rankURL)]);
          browsers[index].rankURL =
            Math.floor((browsers[index].rankURL + 1 - browsers[index].rankURL / allURLRank) * 100) / 100;
          browsers.sort(function (a, b) {
            switch (preferences().sort) {
              case "Rank": {
                return (b.rankText - a.rankText) * 0.2 + (b.rankURL - a.rankURL) * 0.8;
              }
              case "Name+": {
                return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
              }
              case "Name-": {
                return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
              }
              default: {
                return (b.rankText - a.rankText) * 0.2 + (b.rankURL - a.rankURL) * 0.8;
              }
            }
          });
          break;
        }
      }
    }
  });
  await LocalStorage.setItem("browsers", JSON.stringify(browsers));
}

async function clearBrowserRank(browsers: SurfApplication[]) {
  browsers.forEach((value) => {
    value.rankText = 1;
    value.rankURL = 1;
  });
  await LocalStorage.setItem("browsers", JSON.stringify(browsers));
}
