import type { BrowserEntry, Scope, Source } from "./types";
import type { ChromeContext } from "./browser/chrome";

export type ResultActionKind = "open" | "newTab" | "here" | "copy";
export type ActionId =
  | `${Source}.open`
  | `${Source}.here`
  | `source.${Scope}`
  | "newTab"
  | "copy"
  | "toggleDetail";
export interface ActionDefinition {
  id: ActionId;
  title: string;
  group: "common" | Source;
  defaultShortcut: string | null;
}

export const actionDefinitions: ActionDefinition[] = [
  {
    id: "newTab",
    title: "Open in New Tab",
    group: "common",
    defaultShortcut: null,
  },
  { id: "copy", title: "Copy URL", group: "common", defaultShortcut: "cmd+c" },
  {
    id: "toggleDetail",
    title: "Expand/Collapse Preview",
    group: "common",
    defaultShortcut: "cmd+d",
  },
  ...(["all", "tab", "bookmark", "history"] as const).map((scope, index) => ({
    id: `source.${scope}` as const,
    title: `Search ${{ all: "All Sources", tab: "Open Tabs", bookmark: "Bookmarks", history: "History" }[scope]}`,
    group: "common" as const,
    defaultShortcut: `cmd+shift+${index}`,
  })),
  ...(["tab", "bookmark", "history"] as const).flatMap((source) => [
    {
      id: `${source}.open` as const,
      title: source === "tab" ? "Switch to Tab" : "Open in Chrome",
      group: source,
      defaultShortcut: null,
    },
    {
      id: `${source}.here` as const,
      title: "Open in Current Tab",
      group: source,
      defaultShortcut: "shift+return",
    },
  ]),
];

export function resultActions(
  source: Source,
): Array<{ id: ActionId; kind: ResultActionKind; title: string }> {
  const ids: Array<[ActionId, ResultActionKind]> = [
    [`${source}.open`, "open"],
    ["newTab", "newTab"],
    [`${source}.here`, "here"],
    ["copy", "copy"],
  ];
  return ids.map(([id, kind]) => ({
    id,
    kind,
    title: actionDefinitions.find((action) => action.id === id)!.title,
  }));
}

export type CapturedContext = Promise<
  | { context: ChromeContext | null; error?: never }
  | { error: unknown; context?: never }
>;

/** 等待捕获后再解析结果，避免等待期间数据版本已变化。 */
export async function executeResultAction(
  kind: ResultActionKind,
  resolve: () => BrowserEntry,
  captured: CapturedContext,
  operations: {
    open: (entry: BrowserEntry) => Promise<unknown>;
    openUrl: (
      url: string,
      mode: "newTab" | "here",
      target: ChromeContext | null,
    ) => Promise<unknown>;
    copy: (url: string) => Promise<unknown>;
  },
) {
  if (kind === "copy") return operations.copy(resolve().url);
  if (kind === "open") return operations.open(resolve());
  const capture = await captured;
  if ("error" in capture) throw capture.error;
  return operations.openUrl(resolve().url, kind, capture.context);
}
