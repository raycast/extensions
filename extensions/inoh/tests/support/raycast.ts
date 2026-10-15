import { createElement, type ReactNode } from "react";
import { vi } from "vitest";

type ComponentProps = {
  children?: ReactNode;
  actions?: ReactNode;
  searchBarAccessory?: ReactNode;
};

function _createComponent(name: string) {
  return (props: ComponentProps) => createElement(name, props, props.children, props.actions, props.searchBarAccessory);
}

export const Action = Object.assign(_createComponent("action"), {
  SubmitForm: _createComponent("submit-form"),
  OpenInBrowser: _createComponent("open-in-browser"),
  Style: { Destructive: "destructive" },
});
export const ActionPanel = Object.assign(_createComponent("action-panel"), {
  Section: _createComponent("section"),
});
export const List = Object.assign(_createComponent("list"), {
  Item: _createComponent("list-item"),
  EmptyView: _createComponent("empty-view"),
  Dropdown: Object.assign(_createComponent("list-dropdown"), { Item: _createComponent("dropdown-item") }),
});
export const Form = Object.assign(_createComponent("form"), {
  Dropdown: Object.assign(_createComponent("form-dropdown"), { Item: _createComponent("dropdown-item") }),
  TextField: _createComponent("text-field"),
  TextArea: _createComponent("text-area"),
  Description: _createComponent("description"),
});
export const Icon = new Proxy({}, { get: (_target, property) => String(property) });
export const Toast = { Style: { Failure: "failure", Success: "success", Animated: "animated" } };
export const environment = { isDevelopment: false, assetsPath: process.cwd() };
export const open = vi.fn();
export const showToast = vi.fn(async (options: Record<string, unknown>) => ({ ...options }));
export const navigation = { push: vi.fn(), pop: vi.fn() };
/** Returns the navigation stack spies used to complete or cancel sign-in. */
export function useNavigation() {
  return navigation;
}
