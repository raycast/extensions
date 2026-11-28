import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

function component(name: string) {
  return ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) =>
    createElement(
      name,
      props,
      children,
      props.actions as ReactNode,
      props.searchBarAccessory as ReactNode,
      props.metadata as ReactNode,
    );
}
export const Action = Object.assign(component("Action"), {
  Push: component("Action.Push"),
  SubmitForm: component("Action.SubmitForm"),
  OpenInBrowser: component("Action.OpenInBrowser"),
  Style: { Destructive: "destructive" },
});
export const ActionPanel = Object.assign(component("ActionPanel"), { Section: component("ActionPanel.Section") });
export const Form = Object.assign(component("Form"), {
  TextArea: component("Form.TextArea"),
  TextField: component("Form.TextField"),
  Description: component("Form.Description"),
  Separator: component("Form.Separator"),
  LinkAccessory: component("Form.LinkAccessory"),
  Dropdown: Object.assign(component("Form.Dropdown"), { Item: component("Form.Dropdown.Item") }),
});
export const Detail = Object.assign(component("Detail"), {
  Metadata: Object.assign(component("Detail.Metadata"), {
    Label: component("Detail.Metadata.Label"),
    Link: component("Detail.Metadata.Link"),
    Separator: component("Detail.Metadata.Separator"),
    TagList: Object.assign(component("Detail.Metadata.TagList"), { Item: component("Detail.Metadata.TagList.Item") }),
  }),
});
export const List = Object.assign(component("List"), {
  Section: component("List.Section"),
  Item: component("List.Item"),
});
export const Color = { Red: "red", PrimaryText: "primary" };
export const Icon = new Proxy({}, { get: (_target, key) => key });
export const Alert = { ActionStyle: { Default: "default", Destructive: "destructive" } };
export const confirmAlert = vi.fn().mockResolvedValue(true);
export const updateCommandMetadata = vi.fn().mockResolvedValue(undefined);
export const launchCommand = vi.fn().mockResolvedValue(undefined);
export const Toast = { Style: { Failure: "failure" } };
export const showToast = vi.fn().mockResolvedValue(undefined);
export const LaunchType = { UserInitiated: "userInitiated", Background: "background" };
export const environment = { launchType: LaunchType.UserInitiated };
export class Cache extends Map<string, string> {
  constructor(_options?: { namespace?: string }) {
    super();
  }
}
export const pop = vi.fn();
export const push = vi.fn();
export const popToRoot = vi.fn().mockResolvedValue(undefined);
export const useNavigation = () => ({ pop, push });
export const LocalStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
export const getApplications = vi.fn();
export const open = vi.fn().mockResolvedValue(undefined);
