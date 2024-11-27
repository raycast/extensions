import { Action, FileIcon, Icon, popToRoot, showHUD } from "@raycast/api";
import { useMemo } from "react";
import { asFile } from "../helpers/save-to-obsidian";
import { useFileIcon } from "../hooks/use-applications";
import { LinkFormState } from "../hooks/use-link-form";
import { usePreference } from "../hooks/use-preferences";
import { FormActionPreference } from "../types";
import * as methods from "./methods";
import { ActionGroup, OrderedActionPanel } from "./order-manager";

const saveFile = (values: LinkFormState["values"]) => asFile(values).then((f) => methods.saveFile(f));
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
const popAndShowHUD = (message: string) => popToRoot().then(() => showHUD(message));

const createObsidianActions = (
  values: LinkFormState["values"],
  icon?: FileIcon
): ActionGroup<FormActionPreference> => ({
  key: "obsidian",
  useDivider: "unless-first",
  title: "Obsidian",
  icon,
  actions: new Map<FormActionPreference, Action.Props>([
    [
      "openObsidian",
      {
        title: "Save and Open Obsidian",
        shortcut: { modifiers: ["cmd", "shift"], key: "o" },
        onAction: async () => {
          const file = await saveFile(values);
          await delay(250); // Kinda gross, but Obsidian doesn't seem to immediately recognize the file.
          return Promise.allSettled([methods.openObsidianFile(file), popAndShowHUD("Opening Obsidian…")]);
        },
      },
    ],
    [
      "copyObsidianUrl",
      {
        title: "Save and Copy Obsidian Link",
        shortcut: { modifiers: ["cmd", "shift"], key: "c" },
        onAction: async () => {
          const file = await saveFile(values);
          return Promise.allSettled([methods.copyObsidianUri(file), popAndShowHUD("Link copied")]);
        },
      },
    ],
    [
      "copyObsidianUrlAsMarkdown",
      {
        title: "Save and Copy as Markdown",
        shortcut: { modifiers: ["cmd", "shift"], key: "l" },
        onAction: async () => {
          const file = await saveFile(values);
          return Promise.allSettled([methods.copyObsidianUriAsMarkdown(file), popAndShowHUD("Link copied")]);
        },
      },
    ],
  ]),
});

const createBrowserActions = (values: LinkFormState["values"]): ActionGroup<FormActionPreference> => ({
  key: "browser",
  useDivider: "unless-first",
  title: "Browser Actions",
  actions: new Map<FormActionPreference, Action.Props>([
    [
      "openUrl",
      {
        title: "Save and Open Link",
        icon: Icon.Globe,
        shortcut: { modifiers: ["cmd", "ctrl"], key: "o" },
        onAction: async () => {
          const file = await saveFile(values);
          return Promise.allSettled([methods.openUrl(file), popAndShowHUD("Opening link…")]);
        },
      },
    ],
    [
      "copyUrl",
      {
        icon: Icon.Link,
        title: "Save and Copy Link",
        shortcut: { modifiers: ["cmd", "ctrl"], key: "c" },
        onAction: async () => {
          const file = await saveFile(values);
          return Promise.allSettled([methods.copyUrl(file), popAndShowHUD("Link copied")]);
        },
      },
    ],
    [
      "copyUrlAsMarkdown",
      {
        icon: Icon.Link,
        title: "Save and Copy as Markdown",
        shortcut: { modifiers: ["cmd", "ctrl"], key: "l" },
        onAction: async () => {
          const file = await saveFile(values);
          return Promise.allSettled([methods.copyUrlAsMarkdown(file), popAndShowHUD("Link copied")]);
        },
      },
    ],
  ]),
});

export type FormActionsProps = { values: LinkFormState["values"] };
export default function FormActions({ values }: FormActionsProps): JSX.Element {
  const { value: obsidianIcon } = useFileIcon("Obsidian");
  const { value: defaultAction } = usePreference("defaultFormAction");

  const obsidianActions = useMemo(() => createObsidianActions(values, obsidianIcon), [values, obsidianIcon]);
  const browserActions = useMemo(() => createBrowserActions(values), [values]);

  return <OrderedActionPanel groups={[obsidianActions, browserActions]} defaultAction={defaultAction} />;
}
