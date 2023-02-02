import { Action, ActionPanel, Toast, getSelectedText, List, getPreferenceValues, showToast, Icon } from "@raycast/api";
import fetch from "node-fetch";
import { useState, useEffect } from "react";

interface Preferences {
  api_token: string;
}

interface Flow {
  id: string;
  databaseId: string;
  destination: string;
  tagName: string;
}

const logoIcons = {
  asana: "../assets/Asana.svg",
  coda: "../assets/Coda.svg",
  "google-calendar": "../assets/GoogleCalendar.svg",
  clickup: "../assets/ClickUp.svg",
  hubspot: "../assets/HubSpot.svg",
  notion: "../assets/Notion.svg",
  pipedrive: "../assets/Pipedrive.svg",
  trello: "../assets/Trello.svg",
  jira: "../assets/Jira.svg",
} as any;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [pages, setPages] = useState([]);
  const [hashtag, setHashtag] = useState([]);
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  async function search() {
    const toast = await showToast({ title: "Updating list of integrations...", style: "ANIMATED" as any });

    const response = await fetch(
      `https://europe-west3-slipbox-6f705.cloudfunctions.net/getUserFlows?api_key=${preferences.api_token}`
    );
    const data = await response.json();
    setPages(data as any);
    toast.style = Toast.Style.Success;
    toast.title = "List of integrations updated";
  }

  useEffect(() => {
    const searchFlows = async () => {
      setIsLoading(true);
      await search();
      setIsLoading(false);
    };
    searchFlows();
  }, []);

  useEffect(() => {
    const croppedHashtag: any = searchText.split(/[\s\n\r]/gim).filter((v) => v.startsWith("#"));
    setHashtag(croppedHashtag[0]);
  }, [searchText]);

  function hasRequiredError(searchText: string) {
    return !searchText;
  }

  async function handleSubmit(searchText: string) {
    if (hasRequiredError(searchText)) return;

    console.log(searchText);

    const toast = await showToast({ title: "Sending to Hints...", style: "ANIMATED" as any });

    fetch(
      `https://europe-west3-slipbox-6f705.cloudfunctions.net/createHintsFromRaycast?api_key=${preferences.api_token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: searchText }),
      }
    );
    toast.style = Toast.Style.Success;
    toast.title = "Successfully sent";
  }

  // ToDo add custom filtering to filter list of flows
  // filterList(items.filter((item) => item.includes(searchText)));

  function handleSubmitWithTag(flowHashtag: string) {
    const messgaeWithHashtag = `${searchText} #${flowHashtag}`;
    console.log(messgaeWithHashtag);
    handleSubmit(messgaeWithHashtag);
    setSearchText(``);
  }

  async function handleSearchFromClipboard() {
    let selectedText;
    try {
      selectedText = await getSelectedText();
    } catch (err) {
      console.log(err);
    }
    if (selectedText) {
      setSearchText(selectedText);
    } else {
      console.log("no selected text");
    }
  }

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Type your text here..."
      throttle={true}
    >
      <List.Item
        title=""
        icon={Icon.Plus}
        subtitle={`Press Enter to send command to AI Assistant ${hashtag ? `in ${hashtag}` : ""}`}
        actions={
          <ActionPanel title="Actions">
            <Action title="Send Command" icon={Icon.PlusCircle} onAction={() => handleSubmit(searchText)} />
            <Action
              title="Paste from Clipboard"
              onAction={handleSearchFromClipboard}
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
            <Action.OpenInBrowser
              title="Open Examples in F.A.Q."
              url="https://hintsapp.notion.site/Hints-Flow-FAQ-4c62567028684fbbbe3e6be1afb738e9"
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            />
          </ActionPanel>
        }
      />

      {pages ? (
        <List.Section title="(Optional) Choose integration to send command">
          {pages.map((flow: Flow) => (
            <List.Item
              key={`search-result-page-${flow.id}`}
              title={`#${flow.tagName}`}
              icon={{ source: logoIcons[flow.destination] }}
              subtitle={`→ ${flow.destination}`}
              keywords={[flow.destination]}
              accessories={[{ text: "active" }]}
              actions={
                <ActionPanel title="Actions">
                  <Action title="Send Command" icon={Icon.Hashtag} onAction={() => handleSubmitWithTag(flow.tagName)} />
                  <Action
                    title="Paste from Clipboard"
                    icon={Icon.Clipboard}
                    onAction={handleSearchFromClipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                  <Action.OpenInBrowser
                    title="Open Examples in F.A.Q."
                    url="https://hintsapp.notion.site/Hints-Flow-FAQ-4c62567028684fbbbe3e6be1afb738e9"
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
