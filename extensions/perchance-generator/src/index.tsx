import {
  Detail,
  ActionPanel,
  Action,
  LaunchProps,
  getPreferenceValues,
  Toast,
  showToast,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";

interface Preferences {
  project: string;
}

export default function Command(props: LaunchProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { project } = props.arguments;
  const selectedGenerator = project === "" ? preferences.project : project;

  try {
    const { isLoading, data, revalidate } = useFetch(
      "https://cat-sequoia-parcel.glitch.me/api?generator=" + selectedGenerator + "&list=output"
    );

    if (String(data) == "undefined") {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "That generator might not exist 🙁" });
      popToRoot();
    } else {
      return (
        <Detail
          isLoading={isLoading}
          markdown={`# ${data}`}
          actions={
            <ActionPanel>
              <Action title="Reload" onAction={() => revalidate()} />
              <Action.Paste title="Paste" content={`${data}`} />
              <Action.CopyToClipboard title="Copy to Clipboard" content={`${data}`} />
              <Action.OpenInBrowser title="Open in Browser" url={`https://perchance.org/${selectedGenerator}`} />
            </ActionPanel>
          }
        />
      );
    }
  } catch (error) {
    showToast({ style: Toast.Style.Failure, title: "Error", message: "Something went wrong" });
  }
}
