import { mock } from "bun:test";
import { createElement, type ReactNode } from "react";
import { createRaycastApiMock } from "./raycastApiMock";

const component = (name: string): unknown =>
  new Proxy(
    (props: Record<string, unknown>) => {
      if (name === "List") {
        listPagination.onLoadMore = (
          props.pagination as { onLoadMore?: () => void } | undefined
        )?.onLoadMore;
      }
      const accessories =
        (props.accessories as Array<{ tooltip?: string }> | undefined) ?? [];
      const words = [
        props.title,
        props.subtitle,
        props.description,
        props.text,
        name.startsWith("Form.") ? props.value : undefined,
        ...accessories.map((accessory) => accessory.tooltip),
      ].filter((word): word is string => typeof word === "string");
      const children = [props.actions, props.children] as ReactNode[];
      const onSubmit = props.onSubmit as
        | ((values: Record<string, string>) => void)
        | undefined;
      const onClick =
        (props.onAction as (() => void) | undefined) ??
        (onSubmit
          ? () => {
              onSubmit(formValues);
            }
          : undefined);
      const tag = onClick ? "button" : "div";
      return createElement(
        tag,
        {
          "data-name": name,
          onClick,
          type: tag === "button" ? "button" : undefined,
        },
        ...words.map((word, index) =>
          createElement("span", { key: index }, `${word} `),
        ),
        ...children,
      );
    },
    {
      // Only capitalised names are sub-components (`List.Item`); anything
      // else, like `prototype`, is left for React to see as missing.
      get: (target, key) =>
        typeof key === "string" && /^[A-Z]/.test(key)
          ? component(`${name}.${key}`)
          : Reflect.get(target, key),
    },
  );
let clipboard: { file?: string; text: string } = { text: "" };
export const setClipboard = (next: { file?: string; text: string }) => {
  clipboard = next;
};

let formValues: Record<string, string> = {};
export const setFormValues = (next: Record<string, string>) => {
  formValues = next;
};

export const listPagination: { onLoadMore?: () => void } = {};

export const navigation = { pops: 0 };

export const shownToasts: Record<string, unknown>[] = [];

const constants = (): unknown =>
  new Proxy({}, { get: (_target, key) => String(key) });

export const mockRaycastUi = () =>
  mock.module("@raycast/api", () => ({
    ...createRaycastApiMock(false, {
      getPreferenceValues: () => ({ apiKey: "test-key" }),
    }),
    Action: component("Action"),
    ActionPanel: component("ActionPanel"),
    Alert: { ActionStyle: { Destructive: "destructive" } },
    Clipboard: {
      read: () => Promise.resolve(clipboard),
      readText: () => Promise.resolve(clipboard.text || undefined),
    },
    Color: constants(),
    Detail: component("Detail"),
    Form: component("Form"),
    Icon: constants(),
    Image: { Mask: constants() },
    Keyboard: { Shortcut: { Common: constants() } },
    List: component("List"),
    Toast: {
      Style: { Animated: "animated", Failure: "failure", Success: "success" },
    },
    confirmAlert: () => Promise.resolve(true),
    open: () => Promise.resolve(),
    openExtensionPreferences: () => undefined,
    showToast: (options: Record<string, unknown>) => {
      const toast = { ...options, hide: () => Promise.resolve() };
      shownToasts.push(toast);
      return Promise.resolve(toast);
    },
    useNavigation: () => ({
      pop: () => {
        navigation.pops += 1;
      },
      push: () => undefined,
    }),
  }));
