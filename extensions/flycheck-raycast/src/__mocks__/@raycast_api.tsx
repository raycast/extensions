import { jest } from "@jest/globals";
import React from "react";

interface ActionProps {
  title: string;
  children?: React.ReactNode;
}

export const Action = (props: ActionProps) => <>{props.title}</>;
Action.CopyToClipboard = (props: ActionProps) => <>{props.title}</>;
Action.OpenInBrowser = (props: ActionProps) => <>{props.title}</>;
Action.Style = {
  Destructive: "destructive",
};

export const ActionPanel = (props: { children: React.ReactNode }) => <>{props.children}</>;
ActionPanel.Section = (props: { children: React.ReactNode }) => <>{props.children}</>;

export enum Icon {
  Cloud = "cloud.png",
  Clock = "clock.png",
  Download = "download.png",
  Gear = "gear.png",
  MagnifyingGlass = "magnifying-glass.png",
  Trash = "trash.png",
  Warning = "warning.png",
  ArrowClockwise = "arrow-clockwise.png",
}

export enum Color {
  Green = "#00ff00",
  Blue = "#0000ff",
  Red = "#ff0000",
  Magenta = "#ff00ff",
  SecondaryText = "#888888",
}

interface ChildrenProps {
  children?: React.ReactNode;
}

export const List = (props: ChildrenProps) => <>{props.children}</>;
List.Item = (props: ChildrenProps) => <>{props.children}</>;
List.Item.Detail = (props: ChildrenProps) => <>{props.children}</>;
List.Item.Detail.Metadata = (props: ChildrenProps) => <>{props.children}</>;
List.Item.Detail.Metadata.Label = () => null;
List.Item.Detail.Metadata.Link = () => null;
List.Item.Detail.Metadata.Separator = () => null;
List.Item.Detail.Metadata.TagList = (props: ChildrenProps) => <>{props.children}</>;
List.Item.Detail.Metadata.TagList.Item = () => null;
List.EmptyView = () => null;
List.Section = (props: ChildrenProps) => <>{props.children}</>;

export const Toast = {
  Style: {
    Success: "success",
    Failure: "failure",
  },
};

export const Keyboard = {
  Shortcut: {
    Common: {
      Refresh: { modifiers: ["cmd"], key: "r" },
      RemoveAll: { modifiers: ["cmd", "shift"], key: "backspace" },
    },
  },
};

export const Alert = {
  ActionStyle: {
    Destructive: "destructive",
  },
};

export const environment = {
  platform: "macOS",
};

export const getPreferenceValues = jest.fn(() => {
  return {
    apiKey: "test-api-key",
    tempUnit: "celsius",
  };
});
export const showToast = jest.fn();
export const confirmAlert = jest.fn(() => Promise.resolve(true));
export const openExtensionPreferences = jest.fn();
