import { ProToolsSession } from "../models/pro-tools-session.model";
import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { ProToolsService } from "../services/pro-tools.service";
import * as Path from "path";

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ProToolsSessionListItem(props: {
  session: ProToolsSession;
  isFavorite: boolean;
  actions?: React.ReactNode;
  onToggleFavoriteAction: () => void;
}): React.ReactElement {
  const navigation = useNavigation();
  // Get preferences
  const preferences = getPreferenceValues();
  const showPath = preferences.showPath || false;

  // Determine what to show as subtitle
  let subtitle = "";
  if (showPath) {
    subtitle = props.session.relativePath;
    if (subtitle === props.session.filePath) {
      // If relativePath is the same as filePath, just show the parent directory name
      subtitle = Path.basename(props.session.directoryPath);
    }
  }

  return (
    <List.Item
      title={props.session.name}
      subtitle={subtitle}
      accessories={[
        {
          tag: {
            value: formatDate(props.session.modifiedDate),
            color: { light: "#007AFF", dark: "#0A84FF" },
          },
          tooltip: `Last modified: ${props.session.modifiedDate.toLocaleString()}`,
        },
      ]}
      icon="pro-tools-session-icon.png"
      actions={
        <ActionPanel>
          {props.actions ? (
            props.actions
          ) : (
            <>
              <Action.Open
                application={ProToolsService.bundleIdentifier}
                title="Open with Pro Tools"
                target={props.session.filePath}
                icon="pro-tools-icon.png"
                onOpen={navigation.pop}
              />
              <Action.ShowInFinder path={props.session.filePath} />
            </>
          )}
          <Action
            title={
              props.isFavorite ? "Remove from Favorites" : "Add to Favorites"
            }
            icon={props.isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={props.onToggleFavoriteAction}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
        </ActionPanel>
      }
    />
  );
}
