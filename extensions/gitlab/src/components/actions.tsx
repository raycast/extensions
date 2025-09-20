import { Action, Image, Keyboard, popToRoot } from "@raycast/api";
import { getPreferPopToRootPreference, getPrimaryActionPreference, PrimaryAction } from "../common";

export function GitLabOpenInBrowserAction(props: {
  url: string;
  title?: string | undefined;
  shortcut?: Keyboard.Shortcut | undefined;
  icon?: Image.ImageLike;
}) {
  const afterOpen = async () => {
    if (getPreferPopToRootPreference()) {
      await popToRoot();
    }
  };
  return (
    <Action.OpenInBrowser
      url={props.url}
      title={props.title}
      shortcut={props.shortcut}
      onOpen={afterOpen}
      icon={props.icon}
    />
  );
}

export function DefaultActions(props: { action?: React.ReactNode; webAction?: React.ReactNode }) {
  const action = props.action;
  const webAction = props.webAction;
  if (action || webAction) {
    if (getPrimaryActionPreference() === PrimaryAction.Detail) {
      return (
        <>
          {action}
          {webAction}
        </>
      );
    } else {
      return (
        <>
          {webAction}
          {action}
        </>
      );
    }
  }
  return null;
}
