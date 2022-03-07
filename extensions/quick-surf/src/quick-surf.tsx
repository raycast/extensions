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
  assembleItemSource,
  assembleItemType,
  fetchDetectedItem,
  isEmpty,
  ItemInput,
  ItemSource,
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
  const [itemInput, setItemInput] = useState<ItemInput>({ type: ItemType.NULL, source: ItemSource.NULL, content: "" });

  useEffect(() => {
    async function fetchSelectedText() {
      const inputItem = await fetchDetectedItem();
      if (inputItem.type == ItemType.NULL) {
        await showToast(Toast.Style.Failure, "Nothing, Enter Now!");
      } else {
        setItemInput(inputItem);
      }
    }

    fetchSelectedText().then();
  }, []);

  useEffect(() => {
    async function fetchSelectedText() {
      const localBrowsers = await LocalStorage.getItem<string>("boards");
      let _browsers = [];
      if (typeof localBrowsers == "string") {
        _browsers = JSON.parse(localBrowsers);
        setBrowsers(boardsSort(_browsers, itemInput));
      }
    }

    fetchSelectedText().then();
  }, [itemInput]);

  return (
    <List
      isLoading={false}
      searchBarPlaceholder={"Enter url, text or email"}
      selectedItemId={(function () {
        if (browsers.length === 0) {
          return "MoreBoards";
        }
        return browsers[0].name;
      })()}
      onSearchTextChange={(input) => {
        setItemInput(assembleItemType(assembleItemSource(input, ItemSource.ENTER)));
      }}
    >
      <List.Section title={"Type: " + itemInput.type + "  Source: " + itemInput.source}>
        <List.Item
          id="Type"
          title={itemInput.content}
          icon={Icon.Text}
          accessoryTitle={"WordCount  " + itemInput.content.length}
          actions={
            <ActionPanel>
              <Action
                title={actionTitle(itemInput, "Default")}
                icon={actionIcon(itemInput)}
                onAction={async () => {
                  if (itemInput.type == ItemType.NULL) {
                    const selectedItem = await fetchDetectedItem();
                    if (selectedItem.type == ItemType.NULL) {
                      await showToast(Toast.Style.Failure, "Nothing, Enter Now!");
                    } else {
                      setItemInput(selectedItem);
                    }
                  } else {
                    await showHUD("Surf with default!");
                    await open(searchEngineURLBuilder(itemInput));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Surfboard">
        {browsers.map((browser, index) => {
          return (
            <ApplicationsListItem
              key={browser.path}
              inputText={itemInput}
              setItemInput={setItemInput}
              setBrowsers={setBrowsers}
              index={index}
              browsers={browsers}
            />
          );
        })}
      </List.Section>

      <MoreBoards key={"MoreBoards"} setBrowsers={setBrowsers} />
    </List>
  );
}

function MoreBoards(props: { setBrowsers: any }) {
  const setBrowsers = props.setBrowsers;
  const { push } = useNavigation();

  return (
    <List.Item
      id="MoreBoards"
      title={"More Boards"}
      icon={{ source: { light: "quick-surf.png", dark: "quick-surf@dark.png" } }}
      // accessoryTitle={"❯"}
      accessoryIcon={Icon.ArrowRight}
      actions={
        <ActionPanel title="Game controls">
          <Action
            title="More Boards"
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
  setBrowsers: any;
  index: number;
  browsers: SurfApplication[];
}) {
  const index = props.index;
  const setItemInput = props.setItemInput;
  const inputText = props.inputText;
  const setBrowsers = props.setBrowsers;
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
            title={actionTitle(inputText, application.name)}
            icon={actionIcon(inputText)}
            onAction={async () => {
              await upBrowserRank(inputText, application, applications);
              await actionOnApplicationItem(inputText, setItemInput, application);
            }}
          />
          <Action
            title={"Reset All Rank"}
            icon={Icon.ArrowClockwise}
            onAction={async () => {
              setBrowsers(await clearBrowserRank(applications));
              await showToast(Toast.Style.Success, "Rank Reset!");
            }}
          />
        </ActionPanel>
      }
    />
  );
}

const actionTitle = (inputText: ItemInput, applicationName: string) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return "Search with " + applicationName;
    case ItemType.URL:
      return "Open with " + applicationName;
    case ItemType.EMAIL:
      return "Email with " + applicationName;
    case ItemType.NULL:
      return "Detect";
  }
};

const actionIcon = (inputText: ItemInput) => {
  switch (inputText.type) {
    case ItemType.TEXT:
      return Icon.MagnifyingGlass;
    case ItemType.URL:
      return Icon.Link;
    case ItemType.EMAIL:
      return Icon.Envelope;
    case ItemType.NULL:
      return Icon.Binoculars;
  }
};

async function actionOnApplicationItem(inputText: ItemInput, setItemInput: any, app: SurfApplication) {
  if (inputText.type != ItemType.NULL) {
    switch (inputText.type) {
      case ItemType.URL:
        await showHUD("Open URL with " + app.name);
        break;
      case ItemType.TEXT:
        await showHUD("Search Text by " + preferences().engine + " with " + app.name);
        break;
      case ItemType.EMAIL:
        await showHUD("Send Email with " + app.name);
        break;
    }
    await openSurfboard(searchEngineURLBuilder(inputText), app.path);
    await popToRoot({ clearSearchBar: true });
  } else {
    const selectedItem = await fetchDetectedItem();
    if (selectedItem.type == ItemType.NULL) {
      await showToast(Toast.Style.Failure, "Nothing, Enter Now!");
    } else {
      setItemInput(selectedItem);
    }
  }
}

async function openSurfboard(url: string, path: string) {
  try {
    await open(url, path);
  } catch (e) {
    await showHUD("Unknown Error!");
  }
}

function searchEngineURLBuilder(itemInput: ItemInput): string {
  switch (itemInput.type) {
    case ItemType.EMAIL: {
      return itemInput.content;
    }
    default: {
      switch (preferences().engine) {
        case "Google": {
          return urlBuilder(SEARCH_ENGINE.google, itemInput.content);
        }
        case "Bing": {
          return urlBuilder(SEARCH_ENGINE.bing, itemInput.content);
        }
        case "Baidu": {
          return urlBuilder(SEARCH_ENGINE.baidu, itemInput.content);
        }
        case "Brave": {
          return urlBuilder(SEARCH_ENGINE.brave, itemInput.content);
        }
        case "DuckDuckGo": {
          return urlBuilder(SEARCH_ENGINE.duckduckgo, itemInput.content);
        }
      }
      return urlBuilder(SEARCH_ENGINE.google, itemInput.content);
    }
  }
}

/**
 *
 * Rank increase: Percentage rank
 * The larger the rank, the smaller the increase
 * The smaller the rank, the larger the increase
 *
 */
async function upBrowserRank(itemInput: ItemInput, browser: SurfApplication, browsers: SurfApplication[]) {
  browsers.map((val, index) => {
    if (val.name == browser.name) {
      switch (itemInput.type) {
        case ItemType.TEXT: {
          let allTextRank = 0;
          browsers.forEach((value) => [(allTextRank = allTextRank + value.rankText)]);
          browsers[index].rankText =
            Math.floor((browsers[index].rankText + 1 - browsers[index].rankText / allTextRank) * 100) / 100;
          break;
        }
        case ItemType.EMAIL: {
          let allEmailRank = 0;
          browsers.forEach((value) => [(allEmailRank = allEmailRank + value.rankEmail)]);
          browsers[index].rankEmail =
            Math.floor((browsers[index].rankEmail + 1 - browsers[index].rankEmail / allEmailRank) * 100) / 100;
          break;
        }
        case ItemType.URL: {
          let allURLRank = 0;
          browsers.forEach((value) => [(allURLRank = allURLRank + value.rankURL)]);
          browsers[index].rankURL =
            Math.floor((browsers[index].rankURL + 1 - browsers[index].rankURL / allURLRank) * 100) / 100;
          break;
        }
      }
    }
  });
  boardsSort(browsers, itemInput);
  await LocalStorage.setItem("boards", JSON.stringify(browsers));
}

async function clearBrowserRank(browsers: SurfApplication[]) {
  browsers.forEach((value) => {
    value.rankText = 1;
    value.rankURL = 1;
    value.rankEmail = 1;
  });
  browsers.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem("boards", JSON.stringify(browsers));
  return [...browsers];
}

function boardsSort(browsers: SurfApplication[], inputItem: ItemInput) {
  switch (preferences().sort) {
    case "Rank": {
      return browsers.sort(function (a, b) {
        return sortByItemType(inputItem, a, b);
      });
    }
    case "Name+": {
      return browsers.sort(function (a, b) {
        return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
      });
    }
    case "Name-": {
      return browsers.sort(function (a, b) {
        return b.name.toUpperCase() > a.name.toUpperCase() ? 1 : -1;
      });
    }
    default: {
      return browsers;
    }
  }
}

function sortByItemType(inputItem: ItemInput, a: SurfApplication, b: SurfApplication) {
  switch (inputItem.type) {
    case ItemType.EMAIL: {
      return b.rankEmail - a.rankEmail;
    }
    case ItemType.URL: {
      return (b.rankURL - a.rankURL) * 0.75 + (b.rankText - a.rankText) * 0.25;
    }
    case ItemType.TEXT: {
      return (b.rankText - a.rankText) * 0.75 + (b.rankURL - a.rankURL) * 0.25;
    }
    case ItemType.NULL: {
      return 0;
    }
  }
}
