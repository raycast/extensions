import { Action, Image, Keyboard, popToRoot } from "@raycast/api";
import { getPreferPopToRootPreference, getPrimaryActionPreference, PrimaryAction } from "../common";

export function GitLabOpenInBrowserAction(props: {
  url: string;
  title?: string | undefined;
  shortcut?: Keyboard.Shortcut | undefined;
  icon?: Image.ImageLike;
}) {
  return (
    <Action.OpenInBrowser
      url={props.url}
      title={props.title}
      shortcut={props.shortcut ?? { modifiers: ["cmd"], key: "o" }}
      onOpen={async () => {
        if (getPreferPopToRootPreference()) {
          await popToRoot();
        }
      }}
      icon={props.icon}
    />
  );
}

export function DefaultActions(props: { action?: React.ReactNode; webAction?: React.ReactNode }) {
  if (props.action || props.webAction) {
    if (getPrimaryActionPreference() === PrimaryAction.Detail) {
      return (
        <>
          {props.action}
          {props.webAction}
        </>
      );
    } else {
      return (
        <>
          {props.webAction}
          {props.action}
        </>
      );
    }
  }
  return null;
}
