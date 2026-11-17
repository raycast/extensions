import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import {
  BlipIncompatibleError,
  BlipNotInstalledError,
  BlipNotRunningError,
  BlipNotSignedInError,
  userMessage,
} from "../lib/client";
import { DrpcError } from "../lib/drpc";
import { OpenBlipAction } from "./OpenBlipAction";

const GET_BLIP_URL = "https://blip.net";
const REPORT_URL =
  "https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&extension-url=https%3A%2F%2Fwww.raycast.com%2Fastroboii47%2Fblip-raycast";

const openAction = <OpenBlipAction />;
const getAction = <Action.OpenInBrowser title="Get Blip" icon={Icon.Download} url={GET_BLIP_URL} />;
const reportAction = <Action.OpenInBrowser title="Report Issue" icon={Icon.Bug} url={REPORT_URL} />;
const copyAction = (message: string) => (
  <Action.CopyToClipboard title="Copy Error" icon={Icon.CopyClipboard} content={message} />
);

/** Title, description and the actions that actually help, for each way Blip can be unavailable. */
function describe(error: Error): { icon: Icon; title: string; description: string; actions: ReactNode } {
  if (error instanceof BlipNotInstalledError) {
    return { icon: Icon.Download, title: "Blip Isn't Installed", description: error.message, actions: getAction };
  }
  if (error instanceof BlipNotSignedInError) {
    return { icon: Icon.Person, title: "Sign In to Blip", description: error.message, actions: openAction };
  }
  if (error instanceof BlipNotRunningError) {
    return {
      icon: Icon.Plug,
      title: "Can't Reach Blip",
      description: error.message,
      actions: (
        <>
          {openAction}
          {copyAction(error.message)}
        </>
      ),
    };
  }
  if (error instanceof BlipIncompatibleError) {
    return {
      icon: Icon.Warning,
      title: "This Blip Version Isn't Supported Yet",
      description: `${error.message} Check for extension updates, or report the issue.`,
      actions: (
        <>
          {reportAction}
          {copyAction(error.message)}
        </>
      ),
    };
  }
  if (error instanceof DrpcError) {
    return {
      icon: Icon.Plug,
      title: "Blip Isn't Responding",
      description: userMessage(error),
      actions: (
        <>
          {openAction}
          {copyAction(error.message)}
        </>
      ),
    };
  }
  return {
    icon: Icon.Warning,
    title: "Something Went Wrong",
    description: error.message,
    actions: (
      <>
        {copyAction(error.message)}
        {reportAction}
      </>
    ),
  };
}

/** Full-screen error for when Blip can't be used at all. Shown in place of a list. */
export function BlipErrorView({ error }: { error: Error }) {
  const { icon, title, description, actions } = describe(error);
  return (
    <List searchBarPlaceholder="Blip is unavailable">
      <List.EmptyView
        icon={icon}
        title={title}
        description={description}
        actions={<ActionPanel>{actions}</ActionPanel>}
      />
    </List>
  );
}
