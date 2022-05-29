import {
  Action,
  ActionPanel,
  Icon,
  Image,
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
import { preferences, SurfApplication, urlBuilder } from "./utils";
import { SEARCH_ENGINE } from "./constants";
import ApplicationsList from "./surfbrowser";
import { fetchItemInput, ItemInput, ItemSource, ItemType } from "./input";

//main view
export default function SurfWithSpecificBrowser() {
  const [browsers, setBrowsers] = useState<SurfApplication[]>([]);
  const [searchBarText, setSearchBarText] = useState<string>("");
  const [itemInput, setItemInput] = useState<ItemInput>(new ItemInput());

  useEffect(() => {
    async function fetchSelectedText() {
      const inputItem = await fetchItemInput();
      if (inputItem.type == ItemType.NULL) {
        await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
      } else {
        setItemInput(inputItem);
      }
    }
    fetchSelectedText().then();
  }, []);

  useEffect(() => {
    async function fetchBrowsers() {
      const localBrowsers = await LocalStorage.getItem<string>("boards");
      let _browsers = [];
      if (typeof localBrowsers == "string") {
        _browsers = JSON.parse(localBrowsers) as SurfApplication[];
        setBrowsers(boardsSort(_browsers, itemInput));
      }
    }
    fetchBrowsers().then();
  }, []);

  useEffect(() => {
    async function fetchSelectedText() {
      setBrowsers(boardsSort([...browsers], itemInput));
    }
    fetchSelectedText().then();
  }, [itemInput]);

  return (
    <List
      isLoading={false}
      searchText={searchBarText}
      searchBarPlaceholder={"Enter url, text or email"}
      selectedItemId={(function () {
        if (browsers.length === 0) {
          return "MoreBoards";
        }
        return browsers[0].name;
      })()}
      onSearchTextChange={(input) => {
        const itemInput = new ItemInput();
        setItemInput(itemInput.setContent(input.substring(0, 9999)).setSource(ItemSource.ENTER).setType());
      }}
    >
      <List.Section title={"Type: " + itemInput.type + "  Source: " + itemInput.source}>
        <List.Item
          id="Type"
          title={itemInput.content}
          icon={Icon.Text}
          accessories={[{ text: "WordCount  " + itemInput.content.length }]}
          actions={
            <ActionPanel>
              <Action
                title={actionTitle(itemInput, "Default")}
                icon={actionIcon(itemInput)}
                onAction={async () => {
                  if (itemInput.type == ItemType.NULL) {
                    const selectedItem = await fetchItemInput();
                    if (selectedItem.type == ItemType.NULL) {
                      await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
                    } else {
                      setSearchBarText("");
                      setItemInput(selectedItem);
                    }
                  } else {
                    await showHUD("Surf with default!");
                    await open(searchEngineURLBuilder(itemInput));
                  }
                }}
              />
              <Action
                title={"Edit in Search Bar"}
                icon={Icon.Pencil}
                onAction={async () => {
                  setSearchBarText(itemInput.content);
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
              itemInput={itemInput}
              setSearchBarText={setSearchBarText}
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
      icon={{ source: "more-board.png", mask: Image.Mask.RoundedRectangle }}
      accessories={[{ icon: Icon.ArrowRight }]}
      actions={
        <ActionPanel>
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
  itemInput: ItemInput;
  setSearchBarText: any;
  setItemInput: any;
  setBrowsers: any;
  index: number;
  browsers: SurfApplication[];
}) {
  const index = props.index;
  const setSearchBarText = props.setSearchBarText;
  const setItemInput = props.setItemInput;
  const itemInput = props.itemInput;
  const setBrowsers = props.setBrowsers;
  const applications = props.browsers;
  const application = applications[index];

  return (
    <List.Item
      id={application.name}
      key={application.bundleId}
      title={application.name}
      icon={{ fileIcon: application.path }}
      accessories={[
        {
          text: (function (index: number): string {
            return "⌘ " + (index + 2);
          })(index),
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={actionTitle(itemInput, application.name)}
            icon={actionIcon(itemInput)}
            onAction={async () => {
              await upBrowserRank(itemInput, application, applications);
              await actionOnApplicationItem(itemInput, setSearchBarText, setItemInput, application);
            }}
          />
          <Action
            title={"Edit in Search Bar"}
            icon={Icon.Pencil}
            onAction={async () => {
              setSearchBarText(itemInput.content);
            }}
          />
          <Action
            title={`Reset ${application.name} Rank`}
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              setBrowsers(await clearRank(application, applications));
              await showToast(Toast.Style.Success, `Rank of ${application.name} Reset!`);
            }}
          />
          <Action
            title={"Reset All Rank"}
            icon={Icon.ExclamationMark}
            shortcut={{ modifiers: ["shift", "cmd"], key: "r" }}
            onAction={async () => {
              setBrowsers(await clearALLRank(applications));
              await showToast(Toast.Style.Success, "Rank of All Reset!");
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

async function actionOnApplicationItem(
  inputText: ItemInput,
  setSearchBarText: any,
  setItemInput: any,
  app: SurfApplication
) {
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
    const selectedItem = await fetchItemInput();
    if (selectedItem.type == ItemType.NULL) {
      await showToast(Toast.Style.Failure, "Nothing is detected from Selected or Clipboard!");
    } else {
      setSearchBarText("");
      setItemInput(selectedItem);
    }
  }
}

async function openSurfboard(url: string, path: string) {
  try {
    await open(url, path);
  } catch (e) {
    await showHUD("Error Input!");
  }
}

function searchEngineURLBuilder(itemInput: ItemInput): string {
  switch (itemInput.type) {
    case ItemType.EMAIL: {
      return itemInput.content;
    }
    case ItemType.URL: {
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
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankText >= browser.rankText;
          });
          if (moreHighRank.length == 0) {
            break;
          }
          let allTextRank = 0;
          browsers.forEach((value) => [(allTextRank = allTextRank + value.rankText)]);
          browsers[index].rankText =
            Math.floor((browsers[index].rankText + 1 - browsers[index].rankText / allTextRank) * 100) / 100;
          break;
        }
        case ItemType.EMAIL: {
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankEmail >= browser.rankEmail;
          });
          if (moreHighRank.length == 0) {
            break;
          }
          let allEmailRank = 0;
          browsers.forEach((value) => [(allEmailRank = allEmailRank + value.rankEmail)]);
          browsers[index].rankEmail =
            Math.floor((browsers[index].rankEmail + 1 - browsers[index].rankEmail / allEmailRank) * 100) / 100;
          break;
        }
        case ItemType.URL: {
          //Prevent excessive rank growth
          const moreHighRank = browsers.filter((value) => {
            return value.path !== browser.path && value.rankURL >= browser.rankURL;
          });
          if (moreHighRank.length == 0) {
            break;
          }
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

async function clearRank(surfApplication: SurfApplication, surfApplications: SurfApplication[]) {
  surfApplications.map((value) => {
    if (value.path == surfApplication.path) value.rankText = 1;
    value.rankURL = 1;
    value.rankEmail = 1;
  });
  surfApplications.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem("boards", JSON.stringify(surfApplications));
  return [...surfApplications];
}

async function clearALLRank(surfApplications: SurfApplication[]) {
  surfApplications.forEach((value) => {
    value.rankText = 1;
    value.rankURL = 1;
    value.rankEmail = 1;
  });
  surfApplications.sort(function (a, b) {
    return b.name.toUpperCase() < a.name.toUpperCase() ? 1 : -1;
  });
  await LocalStorage.setItem("boards", JSON.stringify(surfApplications));
  return [...surfApplications];
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
