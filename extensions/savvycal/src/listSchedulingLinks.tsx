import {
  ActionPanel,
  Action,
  Color,
  Detail,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchLinksList, toggleLink, SAVVYCAL_BASE_URL } from "./api";
import { SchedulingLink, PaginatedList } from "./types";

interface Links {
  links?: SchedulingLink[];
  error?: unknown;
}

interface State {
  state: string;
}

export const savvycalIcon = getFavicon("https://savvycal.com");
const greenIcon = { source: Icon.CircleFilled, tintColor: Color.Green };
const redIcon = { source: Icon.CircleFilled, tintColor: Color.Red };

async function tryToggleLink(link_id: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling the link",
  });

  try {
    const { state } = await toggleLink(link_id);

    if (state == "active") {
      toast.style = Toast.Style.Success;
      toast.title = "Link is now active!";
    } else {
      toast.style = Toast.Style.Success;
      toast.title = "Link is now inactive.";
    }
  } catch (error: unknown) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle the link";
  }
}

export default function listSchedulingLinks() {
  const [links, setLinks] = useState<Links>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const { entries: entries } = await fetchLinksList();
        setLinks({ links: entries });
      } catch (error: unknown) {
        console.error("Error fetching links:\n", error);
        setLinks({
          error: error,
        });
        showToast({
          style: Toast.Style.Failure,
          title: "Savvycal API Error",
          message:
            "Check your Savvycal token + username in the extension preferences",
        });
      }
    }

    fetchData();
  }, []);

  return (
    <List
      enableFiltering={true}
      isLoading={links.links?.length === 0 || !links.links}
      navigationTitle="List Savvycal links"
      searchBarPlaceholder="Filter by link title"
    >
      {links.links?.map((link: SchedulingLink) => (
        <List.Item
          key={link.id}
          title={link.name}
          subtitle={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
          icon={savvycalIcon}
          accessories={[{ icon: link.state == "active" ? greenIcon : redIcon }]} //TODO: there's probably a way to make this reactive
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy URL to Clipboard"
                content={
                  SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug
                }
              />
              <Action.Paste
                title="Paste URL in Place"
                content={
                  SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug
                }
              />
              <Action.OpenInBrowser
                // icon={}
                title="Open in Browser"
                url={
                  SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              />
              <Action
                icon={savvycalIcon}
                title="Toggle Link"
                onAction={() => {
                  tryToggleLink(link.id);
                }}
                shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
