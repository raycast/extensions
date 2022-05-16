import {
  ActionPanel,
  Action,
  Detail,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ImageLike,
  useNavigation,
  Navigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { BuildStarted } from "./workflows";

export function BuildStartedDetail(props: { buildStarted: BuildStarted }) {
  return (
    <Detail
      markdown={`Build #${props.buildStarted.build_number} started`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.buildStarted.build_url} />
          <Action.CopyToClipboard
            title="Copy Build Number"
            content={`#${props.buildStarted.build_number}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
