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
import { urlBuilder, getInputText, SearchText, TextType, setInputText } from "./utils";
import { GOOGLE_SEARCH, BING_SEARCH, BAIDU_SEARCH, DUCKDUCKGO_SEARCH } from "./constants";
import ApplicationsList from "./surfbrowser";

interface Preferences {
  engine: string;
}

//main view
export default function BrowserApplicationList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [text, setText] = useState<SearchText>({ type: TextType.NULL, content: "" });
  const [toSurfBrowser, setToSurfBrowser] = useState<number>(0);

  useEffect(() => {
    async function getText() {
      setText(await getInputText());
    }

    getText();
  }, []);

  useEffect(() => {
    async function fetchApplications() {
      const applicationsAdd = Object.entries(await LocalStorage.allItems());
      const apps = [];
      for (const [key, value] of applicationsAdd) {
        apps.push({ bundleId: "", name: key, path: value + "" });
      }
      apps.sort(function compare(a: Application, b: Application) {
        const bandA = a.name.toUpperCase();
        const bandB = b.name.toUpperCase();
        return bandA > bandB ? 1 : -1;
      });
      setApplications(apps);
    }

    fetchApplications();
  }, [toSurfBrowser]);

  return (
    <List
      isLoading={applications.length === 0}
      searchBarPlaceholder={"Surf any with..."}
      selectedItemId={(function () {
        if (applications.length === 0) {
          return "GetBrowser";
        }
        return applications[0].name;
      })()}
      onSearchTextChange={(input) => {
        setText(setInputText(input));
      }}
    >
      <List.Section title={"Type: " + text.type}>
        <List.Item
          id=""
          title={text.content}
          icon={Icon.Text}
          accessoryTitle={"WordCount  " + text.content.length}
          actions={
            <ActionPanel>
              <Action
                title={(function (input: SearchText) {
                  switch (input.type) {
                    case TextType.TEXT: {
                      return "Search with Default Browser";
                    }
                    case TextType.URL: {
                      return "Open with Browser";
                    }
                    case TextType.NULL: {
                      return "Detect";
                    }
                  }
                })(text)}
                icon={(function (input: SearchText) {
                  switch (input.type) {
                    case TextType.TEXT:
                      return Icon.MagnifyingGlass;
                    case TextType.URL:
                      return Icon.Link;
                    case TextType.NULL:
                      return Icon.Binoculars;
                  }
                })(text)}
                onAction={async () => {
                  try {
                    if (text.type == TextType.NULL) {
                      setText(await getInputText());
                    } else {
                      showHUD("Surf with default browser!");
                      open(searchURLBuilder(text.content));
                    }
                  } catch (error) {
                    console.debug("error " + error);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Surf Browser">
        {applications.map((application, index) => {
          return (
            <ApplicationsListItem key={application.path} index={index} inputText={text} application={application} />
          );
        })}
      </List.Section>

      <GetBrowser key={"GetBrowser"} applications={applications} setToSurfBrowser={setToSurfBrowser} />
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
function ApplicationsListItem(props: { index: number; inputText: SearchText; application: Application }) {
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
            title={(function (input: SearchText): string {
              let action = "";
              switch (input.type) {
                case TextType.TEXT:
                  action = "Search with ";
                  break;
                case TextType.URL:
                  action = "Open with ";
                  break;
                case TextType.NULL:
                  action = "";
                  break;
              }
              return action + application.name;
            })(inputText)}
            icon={(function (input: SearchText) {
              switch (input.type) {
                case TextType.TEXT:
                  return Icon.MagnifyingGlass;
                case TextType.URL:
                  return Icon.Link;
                case TextType.NULL:
                  return Icon.Window;
              }
            })(inputText)}
            onAction={async () => {
              actionApplication(inputText, application);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function actionApplication(inputText: SearchText, app: Application) {
  if (inputText.type != TextType.NULL) {
    if (inputText.type == TextType.URL) {
      showHUD("Open URL in" + app.name);
    } else {
      const preference = getPreferenceValues<Preferences>();
      showHUD("Search Text in " + Object.values(preference)[0]);
    }
    open(searchURLBuilder(inputText.content), app.path);
  } else {
    showToast(Toast.Style.Failure, "No Text or URL Detected!");
  }
}

function searchURLBuilder(content: string): string {
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
