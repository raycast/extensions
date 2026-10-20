import { mock } from "bun:test";
import { createElement, type ReactNode } from "react";
import { createRaycastApiMock } from "./raycastApiMock";

// Every Raycast component renders its visible words (title, subtitle,
// tooltips, empty-view text) and its actions; an action with `onAction` is a
// button, so a test can press it.
const component = (name: string): unknown =>
  new Proxy(
    (props: Record<string, unknown>) => {
      const accessories =
        (props.accessories as Array<{ tooltip?: string }> | undefined) ?? [];
      const words = [
        props.title,
        props.subtitle,
        props.description,
        props.text,
        ...accessories.map((accessory) => accessory.tooltip),
      ].filter((word): word is string => typeof word === "string");
      const children = [props.actions, props.children] as ReactNode[];
      const tag = typeof props.onAction === "function" ? "button" : "div";
      return createElement(
        tag,
        {
          "data-name": name,
          onClick: props.onAction as (() => void) | undefined,
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
    Clipboard: { readText: () => Promise.resolve(undefined) },
    Color: constants(),
    Detail: component("Detail"),
    Form: component("Form"),
    Icon: constants(),
    List: component("List"),
    Toast: {
      Style: { Animated: "animated", Failure: "failure", Success: "success" },
    },
    confirmAlert: () => Promise.resolve(true),
    open: () => Promise.resolve(),
    openExtensionPreferences: () => undefined,
    showToast: () => Promise.resolve({}),
    useNavigation: () => ({ pop: () => undefined, push: () => undefined }),
  }));
