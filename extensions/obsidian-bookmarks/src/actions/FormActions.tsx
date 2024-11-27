import { Action, Color, FileIcon, Icon, popToRoot, showHUD, BrowserExtension, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { asFile } from "../helpers/save-to-obsidian";
import { useFileIcon } from "../hooks/use-applications";
import { LinkFormState } from "../hooks/use-link-form";
import { usePreference } from "../hooks/use-preferences";
import { FormActionPreference } from "../types";
import * as methods from "./methods";
import { ActionGroup, OrderedActionPanel } from "./order-manager";
import { clearCache } from "../helpers/clear-cache";

const saveFile = (values: LinkFormState["values"]) => asFile(values).then((f) => methods.saveFile(f));
const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
const popAndShowHUD = (message: string) => popToRoot().then(() => showHUD(message));

async function fetchPageContent(): Promise<string> {
  try {
    const content = await BrowserExtension.getContent({ format: "markdown" });
    return `\n\n# Page Content\n\n${content}`;
  } catch (error) {
    console.error("Error fetching page content:", error);
    throw error;
  }
}

const createContentActions = (
  values: LinkFormState["values"],
  setValues: (values: LinkFormState["values"]) => void
): ActionGroup<FormActionPreference> => ({
  key: "content",
  useDivider: "unless-first",
  title: "Content Actions",
  actions: new Map<FormActionPreference, Action.Props>([
    [
      "fetchContent" as FormActionPreference,
      {
        title: "Fetch Page Content",
        icon: Icon.Document,
        shortcut: { modifiers: ["cmd"], key: "g" },
        onAction: async () => {
          try {
            const content = await fetchPageContent();
            setValues({
              ...values,
              description: values.description + content,
            });
            await showToast({
              style: Toast.Style.Success,
              title: "Page content added to notes",
            });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to fetch page content",
              message: error instanceof Error ? error.message : String(error),
            });
          }
        },
      },
    ],
  ]),
});

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
          await delay(250);
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

const createDestructiveActions = (): ActionGroup<FormActionPreference> => ({
  key: "destructive",
  useDivider: "always",
  actions: new Map([
    [
      "clearCache",
      {
        title: "Clear Cache",
        icon: { source: Icon.Trash, tintColor: Color.Red },
        shortcut: { modifiers: ["cmd", "opt"], key: "delete" },
        onAction: async () => {
          await clearCache();
          await popToRoot();
        },
      },
    ],
  ]),
});

export type FormActionsProps = {
  values: LinkFormState["values"];
  setValues: (values: LinkFormState["values"]) => void;
};

export default function FormActions({ values, setValues }: FormActionsProps): JSX.Element {
  const { value: obsidianIcon } = useFileIcon("Obsidian");
  const { value: defaultAction } = usePreference("defaultFormAction");

  const obsidianActions = useMemo(() => createObsidianActions(values, obsidianIcon), [values, obsidianIcon]);
  const browserActions = useMemo(() => createBrowserActions(values), [values]);
  const contentActions = useMemo(() => createContentActions(values, setValues), [values, setValues]);
  const destructiveActions = useMemo(() => createDestructiveActions(), []);

  return (
    <OrderedActionPanel
      groups={[obsidianActions, browserActions, contentActions, destructiveActions]}
      defaultAction={defaultAction}
    />
  );
}
