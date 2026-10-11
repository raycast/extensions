import { createElement, ReactNode } from "react";

type Props = Record<string, unknown> & { children?: ReactNode };
const component = (name: string) => (props: Props) =>
  createElement(name, props, props.children, props.actions as ReactNode);
export const Form = Object.assign(component("Form"), {
  Separator: component("Separator"),
  Description: component("Description"),
  FilePicker: component("FilePicker"),
  Checkbox: component("Checkbox"),
  TextArea: component("TextArea"),
  TextField: component("TextField"),
  Dropdown: Object.assign(component("Dropdown"), {
    Item: component("DropdownItem"),
  }),
});
export const Action = Object.assign(component("Action"), {
  SubmitForm: component("SubmitForm"),
  Open: component("Open"),
  OpenInBrowser: component("OpenInBrowser"),
  Style: { Destructive: "destructive" },
});
export const ActionPanel = component("ActionPanel");
export const Detail = component("Detail");
export const List = Object.assign(component("List"), {
  Item: component("ListItem"),
});
export const Icon = {};
export const Keyboard = { Shortcut: { Common: { Refresh: {}, Pin: {} } } };
export const Toast = {
  Style: { Success: "success", Failure: "failure", Animated: "animated" },
};
export const environment = { assetsPath: "/private/tmp/semantic-test-assets" };
export const launcher = {
  serviceURL: "",
  startupCalls: 0,
  failStartup: false,
  toasts: [] as Props[],
};
export const getPreferenceValues = () => ({ serviceURL: launcher.serviceURL });
export async function showToast(props: Props) {
  launcher.toasts.push(props);
  return props;
}
export async function ensureService() {
  launcher.startupCalls += 1;
  if (launcher.failStartup) throw new Error("Synthetic setup failure");
  return "http://127.0.0.1:18799";
}
export async function distribution() {
  return { mode: "companion", installer_url: "https://example.com/engine" };
}
export type Distribution = Awaited<ReturnType<typeof distribution>>;
