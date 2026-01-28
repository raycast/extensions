import fetch from "node-fetch";
import { Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { SchedulingLink } from "@/utils/types";
import {
  SAVVYCAL_API_BASE_URL,
  SAVVYCAL_BASE_URL,
  apiToken,
  linksEndpoint,
  savvycalIcon,
} from "@/utils/savvycal";

async function toggleLink(link_id: string) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling the link",
  });

  const response = await fetch(
    SAVVYCAL_API_BASE_URL + linksEndpoint + "/" + link_id + "/toggle",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Buffer.from(apiToken)}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to toggle the link";
    toast.message = "Check that you have an active plan";
    return;
  }

  const { state } = (await response.json()) as SchedulingLink;

  try {
    toast.style = Toast.Style.Success;
    toast.title = `Link is now ${state}`;
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = `Failed to toggle the link ${err}`;
    return;
  }
}

export default function LinkActions(link: SchedulingLink) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy URL to Clipboard"
        content={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
      />
      <Action.Paste
        title="Paste URL in Place"
        content={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
      />
      <Action.OpenInBrowser
        // icon={}
        title="Open in Browser"
        url={SAVVYCAL_BASE_URL + "/" + link.scope.slug + "/" + link.slug}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
      <Action
        icon={savvycalIcon}
        title="Toggle Link"
        onAction={() => toggleLink(link.id)}
        shortcut={{ modifiers: ["cmd", "opt"], key: "enter" }}
      />
    </ActionPanel>
  );
}
