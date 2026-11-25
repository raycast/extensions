import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  Toast,
  showToast,
} from "@raycast/api";
import { useState } from "react";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import {
  installDependencies,
  isReady,
  readDependencyState,
} from "./lib/dependencies";
import { openCommand } from "./lib/launch";

function markdown(ready: boolean): string {
  if (ready) {
    return [
      "# MITM Proxy Ready",
      "",
      "mitmproxy and `jq` are installed, so every command can drive the proxy.",
      "",
      "Starting the proxy asks once before trusting the mitmproxy root CA in your login keychain, and macOS asks for your password when the system proxy changes.",
    ].join("\n");
  }
  return [
    "# Set Up MITM Proxy",
    "",
    "The extension drives [mitmproxy](https://mitmproxy.org) and reads its state with `jq`. Both come from Homebrew; the control script itself ships inside the extension.",
    "",
    `| Dependency | Command |
| --- | --- |
| mitmproxy | \`brew install --cask mitmproxy\` |
| jq | \`brew install jq\` |`,
    "",
    "Starting the proxy asks once before trusting the mitmproxy root CA in your login keychain, and macOS asks for your password when the system proxy changes.",
  ].join("\n");
}

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    readDependencyState,
    [],
    {
      onError: () => {
        // Shown in the view instead.
      },
    },
  );
  const [installing, setInstalling] = useState(false);

  const ready = data ? isReady(data) : false;

  async function install() {
    if (!data?.brew) return;
    setInstalling(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing mitmproxy and jq",
    });
    try {
      await installDependencies(data.brew);
      await toast.hide();
      await revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: "Dependencies installed",
      });
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, {
        title: "Could not install dependencies",
      });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <Detail
      isLoading={isLoading || installing}
      markdown={markdown(ready)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Homebrew">
            <Detail.Metadata.TagList.Item
              text={data?.brew ? "Found" : "Missing"}
              color={data?.brew ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="mitmproxy">
            <Detail.Metadata.TagList.Item
              text={data?.mitmweb ? "Installed" : "Not installed"}
              color={data?.mitmweb ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="jq">
            <Detail.Metadata.TagList.Item
              text={data?.jq ? "Installed" : "Not installed"}
              color={data?.jq ? Color.Green : Color.Red}
            />
          </Detail.Metadata.TagList>
          {data?.brew ? <Detail.Metadata.Separator /> : null}
          {data?.brew ? (
            <Detail.Metadata.Label title="Homebrew Path" text={data.brew} />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {ready ? (
            <Action
              title="Open Proxy Status"
              icon={Icon.Gauge}
              shortcut={Keyboard.Shortcut.Common.Open}
              onAction={() =>
                openCommand("status", "Could not open Proxy Status")
              }
            />
          ) : data?.brew ? (
            <Action
              title="Install Dependencies"
              icon={Icon.Download}
              onAction={install}
            />
          ) : (
            <Action.OpenInBrowser title="Get Homebrew" url="https://brew.sh" />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
