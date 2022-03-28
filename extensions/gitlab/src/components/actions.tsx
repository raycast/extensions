import { Action, Image, Keyboard, popToRoot } from "@raycast/api";
import React from "react";
import { getPreferPopToRootPreference, getPrimaryActionPreference, PrimaryAction } from "../common";

export function GitLabOpenInBrowserAction(props: {
  url: string;
  title?: string | undefined;
  shortcut?: Keyboard.Shortcut | undefined;
  icon?: Image.ImageLike;
}): JSX.Element {
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

export function DefaultActions(props: {
  action?: JSX.Element | undefined | null;
  webAction?: JSX.Element | undefined | null;
}): JSX.Element | null {
  const action = props.action;
  const webAction = props.webAction;
  if (action || webAction) {
    if (getPrimaryActionPreference() === PrimaryAction.Detail) {
      return (
        <React.Fragment>
          {action}
          {webAction}
        </React.Fragment>
      );
    } else {
      return (
        <React.Fragment>
          {webAction}
          {action}
        </React.Fragment>
      );
    }
  }
  return null;
}
