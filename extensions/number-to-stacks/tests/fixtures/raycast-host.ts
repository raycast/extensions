import { createElement, type ReactNode } from "react";

type HostProps = {
  children?: ReactNode;
  searchBarAccessory?: ReactNode;
  actions?: ReactNode;
};

export const List = Object.assign(
  (props: HostProps) =>
    createElement("main", props, props.searchBarAccessory, props.children),
  {
    Item: (props: HostProps) => createElement("article", props, props.actions),
    EmptyView: "aside",
    Dropdown: Object.assign(
      (props: HostProps) => createElement("select", props, props.children),
      { Item: "option" },
    ),
  },
);

export const Icon = { ExclamationMark: "exclamation" };
export const ActionPanel = "nav";
export const Action = { CopyToClipboard: "button" };
