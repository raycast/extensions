import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Action, Color, Icon, List, type Keyboard } from "@raycast/api";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { DomainTaskItemModel, DomainTaskItemMetadata } from "./domainTaskItemModel";
import { DomainTaskItem, type DomainTaskItemProps, type DomainTaskItemHandler } from "./DomainTaskItem";

vi.mock("@raycast/api", () => {
  const MockAction = function MockAction() {
    return null;
  };
  const MockActionOpen = function MockActionOpen() {
    return null;
  };
  const MockActionCopyToClipboard = function MockActionCopyToClipboard() {
    return null;
  };
  const MockActionPanel = function MockActionPanel() {
    return null;
  };
  const MockListItem = function MockListItem() {
    return null;
  };
  const MockDetail = function MockDetail() {
    return null;
  };
  const MockMetadata = function MockMetadata() {
    return null;
  };
  const MockLabel = function MockLabel() {
    return null;
  };

  return {
    Action: Object.assign(MockAction, {
      Open: MockActionOpen,
      CopyToClipboard: MockActionCopyToClipboard,
    }),
    ActionPanel: MockActionPanel,
    Color: {
      PrimaryText: "primary-text",
      SecondaryText: "secondary-text",
      Blue: "blue",
      Yellow: "yellow",
      Red: "red",
      Green: "green",
    },
    Icon: {
      Circle: "circle",
      CheckCircle: "check-circle",
    },
    List: {
      Item: Object.assign(MockListItem, {
        Detail: Object.assign(MockDetail, {
          Metadata: Object.assign(MockMetadata, { Label: MockLabel }),
        }),
      }),
    },
  };
});

const shortcut = Object.freeze({
  macOS: Object.freeze({ modifiers: Object.freeze(["cmd"]), key: "x" }),
  Windows: Object.freeze({ modifiers: Object.freeze(["ctrl"]), key: "x" }),
}) as Keyboard.Shortcut;

const descriptors = Object.freeze({
  complete: Object.freeze({ key: "complete", title: "Complete Task", shortcut }),
  reopen: Object.freeze({ key: "reopen", title: "Reopen Task", shortcut }),
  edit: Object.freeze({ key: "edit", title: "Edit Task", shortcut }),
  move: Object.freeze({ key: "move", title: "Move to List", shortcut }),
  "open-exact": Object.freeze({ key: "open-exact", title: "Open in TickTick", shortcut }),
  search: Object.freeze({ key: "search", title: "Search in TickTick", shortcut }),
  copy: Object.freeze({ key: "copy", title: "Copy Task", shortcut }),
  refresh: Object.freeze({ key: "refresh", title: "Refresh", shortcut }),
} satisfies Readonly<Record<DomainTaskItemModel["actions"][number]["key"], DomainTaskItemModel["actions"][number]>>);

const baseMetadata: DomainTaskItemMetadata = Object.freeze({
  project: "Work",
  status: "Open",
  priority: "High",
  kind: "Checklist",
  tags: Object.freeze([]),
});

function model(overrides: Partial<DomainTaskItemModel> = {}): DomainTaskItemModel {
  return Object.freeze({
    rowId: '["project-work","task-id"]',
    title: "Ship the extension",
    detailMarkdown: "# Ship the extension",
    copyText: "Ship the extension\n\nPlain content",
    metadata: baseMetadata,
    actions: Object.freeze([descriptors.search, descriptors.copy, descriptors.refresh]),
    ...overrides,
  });
}

type RenderedItemProps = Readonly<{
  id: string;
  title: string;
  icon: unknown;
  accessories: readonly unknown[];
  detail: ReactElement;
  actions?: ReactElement;
}>;

type RenderedActionProps = Readonly<{
  title: string;
  shortcut: Keyboard.Shortcut;
  onAction?: DomainTaskItemHandler;
  target?: string;
  content?: string;
}>;

function renderedItem(props: DomainTaskItemProps): ReactElement<RenderedItemProps> {
  return DomainTaskItem(props) as ReactElement<RenderedItemProps>;
}

function renderedActions(item: ReactElement<RenderedItemProps>): ReactElement<RenderedActionProps>[] {
  if (!item.props.actions) return [];
  return Children.toArray((item.props.actions.props as { children?: ReactNode }).children).filter(
    isValidElement
  ) as ReactElement<RenderedActionProps>[];
}

function renderedMetadata(item: ReactElement<RenderedItemProps>): ReactElement<{ title: string; text: string }>[] {
  const detailProps = item.props.detail.props as Readonly<{ metadata: ReactElement }>;
  const metadataProps = detailProps.metadata.props as Readonly<{ children?: ReactNode }>;
  return Children.toArray(metadataProps.children).filter(isValidElement) as ReactElement<{
    title: string;
    text: string;
  }>[];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DomainTaskItem row rendering", () => {
  it("keeps the public props and zero-argument handler contracts exact", () => {
    expectTypeOf<DomainTaskItemHandler>().toEqualTypeOf<() => void | Promise<void>>();
    expectTypeOf<DomainTaskItemProps>().toEqualTypeOf<
      Readonly<{
        model: DomainTaskItemModel;
        onComplete?: DomainTaskItemHandler;
        onReopen?: DomainTaskItemHandler;
        onEdit?: DomainTaskItemHandler;
        onMove?: DomainTaskItemHandler;
        onRefresh?: DomainTaskItemHandler;
      }>
    >();
  });

  it("maps row identity, title, detail Markdown, status icon, and fixed accessories exactly", () => {
    const source = model();
    const item = renderedItem({ model: source, onRefresh: vi.fn() });
    const detailProps = item.props.detail.props as Readonly<{ markdown: string }>;

    expect(item.type).toBe(List.Item);
    expect(item.props.id).toBe(source.rowId);
    expect(item.props.title).toBe(source.title);
    expect(detailProps.markdown).toBe(source.detailMarkdown);
    expect(item.props.icon).toEqual({ source: Icon.Circle, tintColor: Color.Red });
    expect(item.props.accessories).toEqual([
      { text: "Work", tooltip: "List" },
      { tag: { value: "Open", color: Color.SecondaryText }, tooltip: "Status" },
      { tag: { value: "High", color: Color.Red }, tooltip: "Priority" },
    ]);
  });

  it.each([
    ["Open", Icon.Circle, Color.SecondaryText],
    ["Completed", Icon.CheckCircle, Color.Green],
  ] as const)("maps %s status to fixed icon and accessory color", (status, source, color) => {
    const metadata = Object.freeze({ ...baseMetadata, status });
    const item = renderedItem({ model: model({ metadata }) });

    expect(item.props.icon).toEqual({ source, tintColor: Color.Red });
    expect(item.props.accessories[1]).toEqual({ tag: { value: status, color }, tooltip: "Status" });
  });

  it.each([
    ["None", Color.PrimaryText],
    ["Low", Color.Blue],
    ["Medium", Color.Yellow],
    ["High", Color.Red],
  ] as const)("maps %s priority to a fixed color", (priority, color) => {
    const metadata = Object.freeze({ ...baseMetadata, priority });
    const item = renderedItem({ model: model({ metadata }) });

    expect(item.props.icon).toEqual({ source: Icon.Circle, tintColor: color });
    expect(item.props.accessories[2]).toEqual({ tag: { value: priority, color }, tooltip: "Priority" });
  });
});

describe("detail metadata", () => {
  it("renders all intended visible metadata in fixed order", () => {
    const metadata: DomainTaskItemMetadata = Object.freeze({
      project: "Work",
      status: "Completed",
      priority: "Medium",
      kind: "Checklist",
      date: Object.freeze({
        mode: "bound",
        timeZone: "America/Denver",
        start: "Aug 14, 2026 at 9:00 AM MDT",
        due: "Aug 14, 2026 at 10:00 AM MDT",
      }),
      tags: Object.freeze(["release", "windows"]),
      checklist: Object.freeze({
        completed: 1,
        total: 2,
        items: Object.freeze([
          Object.freeze({ title: "One", status: "Completed", sortOrder: 1 }),
          Object.freeze({ title: "Two", status: "Open", sortOrder: 2 }),
        ]),
      }),
    });
    const labels = renderedMetadata(renderedItem({ model: model({ metadata }) }));

    expect(labels.every((label) => label.type === List.Item.Detail.Metadata.Label)).toBe(true);
    expect(labels.map((label) => label.props)).toEqual([
      { title: "List", text: "Work" },
      { title: "Status", text: "Completed" },
      { title: "Priority", text: "Medium" },
      { title: "Type", text: "Checklist" },
      { title: "Start", text: "Aug 14, 2026 at 9:00 AM MDT" },
      { title: "Due", text: "Aug 14, 2026 at 10:00 AM MDT" },
      { title: "Time Zone", text: "America/Denver" },
      { title: "Tags", text: "release, windows" },
      { title: "Checklist", text: "1 of 2 completed" },
    ]);
  });

  it("omits empty optional date, tag, and checklist metadata", () => {
    const emptyDate = Object.freeze({ mode: "bound" as const, timeZone: "America/Denver" });
    const emptyChecklist = Object.freeze({ completed: 0, total: 0, items: Object.freeze([]) });
    const metadata = Object.freeze({
      ...baseMetadata,
      date: emptyDate,
      tags: Object.freeze([]),
      checklist: emptyChecklist,
    });
    const labels = renderedMetadata(renderedItem({ model: model({ metadata }) }));

    expect(labels.map((label) => label.props.title)).toEqual(["List", "Status", "Priority", "Type"]);
  });

  it("renders independently optional start and due fields with their timezone", () => {
    const startOnly = Object.freeze({
      ...baseMetadata,
      date: Object.freeze({ mode: "floating" as const, timeZone: "Asia/Tokyo", start: "Aug 15 at 9:00 AM JST" }),
    });
    const dueOnly = Object.freeze({
      ...baseMetadata,
      date: Object.freeze({ mode: "all-day" as const, timeZone: "UTC", due: "Aug 15, 2026" }),
    });

    expect(
      renderedMetadata(renderedItem({ model: model({ metadata: startOnly }) })).map((label) => label.props)
    ).toEqual(
      expect.arrayContaining([
        { title: "Start", text: "Aug 15 at 9:00 AM JST" },
        { title: "Time Zone", text: "Asia/Tokyo" },
      ])
    );
    expect(renderedMetadata(renderedItem({ model: model({ metadata: dueOnly }) })).map((label) => label.props)).toEqual(
      expect.arrayContaining([
        { title: "Due", text: "Aug 15, 2026" },
        { title: "Time Zone", text: "UTC" },
      ])
    );
  });
});

describe("action rendering", () => {
  it("preserves model action order across every supported action kind", () => {
    const actions = Object.freeze([
      descriptors.refresh,
      descriptors.search,
      descriptors.complete,
      descriptors.copy,
      descriptors["open-exact"],
      descriptors.move,
      descriptors.edit,
      descriptors.reopen,
    ]);
    const source = model({
      actions,
      exactTarget: "ticktick://exact-task",
      searchTarget: "ticktick://search-task",
    });
    const handler = vi.fn();
    const rendered = renderedActions(
      renderedItem({
        model: source,
        onComplete: handler,
        onReopen: handler,
        onEdit: handler,
        onMove: handler,
        onRefresh: handler,
      })
    );

    expect(rendered.map((action) => action.props.title)).toEqual(actions.map((action) => action.title));
    expect(rendered.map((action) => action.props.shortcut)).toEqual(actions.map((action) => action.shortcut));
    for (const action of rendered) {
      expect("Windows" in action.props.shortcut).toBe(true);
      if ("Windows" in action.props.shortcut) expect(action.props.shortcut.Windows.modifiers).not.toContain("cmd");
    }
  });

  it.each([
    ["complete", "onComplete"],
    ["reopen", "onReopen"],
    ["edit", "onEdit"],
    ["move", "onMove"],
    ["refresh", "onRefresh"],
  ] as const)("renders %s only when both its descriptor and handler exist", (key, prop) => {
    const handler = vi.fn(async () => undefined);
    const withBoth = {
      model: model({ actions: Object.freeze([descriptors[key]]) }),
      [prop]: handler,
    } as DomainTaskItemProps;
    const withDescriptorOnly = { model: model({ actions: Object.freeze([descriptors[key]]) }) } as DomainTaskItemProps;
    const withHandlerOnly = { model: model({ actions: Object.freeze([]) }), [prop]: handler } as DomainTaskItemProps;

    const [rendered] = renderedActions(renderedItem(withBoth));
    expect(rendered.type).toBe(Action);
    expect(rendered.props.onAction).toBe(handler);
    expect(rendered.props.title).toBe(descriptors[key].title);
    expect(rendered.props.shortcut).toBe(descriptors[key].shortcut);
    expect(renderedActions(renderedItem(withDescriptorOnly))).toEqual([]);
    expect(renderedActions(renderedItem(withHandlerOnly))).toEqual([]);
  });

  it("renders exact and search as separate Action.Open targets without fallback", () => {
    const actions = Object.freeze([descriptors["open-exact"], descriptors.search, descriptors.copy]);
    const both = renderedActions(
      renderedItem({
        model: model({ actions, exactTarget: "ticktick://exact-task", searchTarget: "ticktick://search-task" }),
      })
    );
    const exactOnly = renderedActions(
      renderedItem({ model: model({ actions, exactTarget: "ticktick://exact-task", searchTarget: undefined }) })
    );
    const searchOnly = renderedActions(
      renderedItem({ model: model({ actions, exactTarget: undefined, searchTarget: "ticktick://search-task" }) })
    );
    const neither = renderedActions(renderedItem({ model: model({ actions }) }));

    expect(both.map((action) => [action.type, action.props.title, action.props.target])).toEqual([
      [Action.Open, "Open in TickTick", "ticktick://exact-task"],
      [Action.Open, "Search in TickTick", "ticktick://search-task"],
      [Action.CopyToClipboard, "Copy Task", undefined],
    ]);
    expect(exactOnly.map((action) => [action.props.title, action.props.target])).toEqual([
      ["Open in TickTick", "ticktick://exact-task"],
      ["Copy Task", undefined],
    ]);
    expect(searchOnly.map((action) => [action.props.title, action.props.target])).toEqual([
      ["Search in TickTick", "ticktick://search-task"],
      ["Copy Task", undefined],
    ]);
    expect(neither.map((action) => action.props.title)).toEqual(["Copy Task"]);
  });

  it("copies only the normalized model copy text", () => {
    const source = model({ actions: Object.freeze([descriptors.copy]), copyText: "Plain\ncopy\ntext" });
    const [copy] = renderedActions(renderedItem({ model: source }));

    expect(copy.type).toBe(Action.CopyToClipboard);
    expect(copy.props.content).toBe(source.copyText);
    expect(copy.props.title).toBe(descriptors.copy.title);
    expect(copy.props.shortcut).toBe(descriptors.copy.shortcut);
  });

  it("passes callback identity through and propagates rejection unchanged without logging", async () => {
    const failure = new Error("PRIVATE callback failure");
    const onComplete = vi.fn(async () => {
      throw failure;
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const [action] = renderedActions(
      renderedItem({ model: model({ actions: Object.freeze([descriptors.complete]) }), onComplete })
    );

    expect(action.props.onAction).toBe(onComplete);
    await expect(action.props.onAction?.()).rejects.toBe(failure);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(action.props.title).toBe("Complete Task");
    expect(JSON.stringify({ title: action.props.title, shortcut: action.props.shortcut })).not.toContain("PRIVATE");
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("privacy, purity, and dependency boundary", () => {
  it("shows sanitized model values only in intended row/detail/metadata content, never action targets or titles", () => {
    const marker = "SANITIZED-MARKER-7fd3";
    const metadata = Object.freeze({ ...baseMetadata, project: `${marker} List`, tags: Object.freeze([marker]) });
    const source = model({
      title: `\\<${marker}\\>`,
      detailMarkdown: `# \\<${marker}\\>`,
      copyText: marker,
      metadata,
      exactTarget: "ticktick://safe-exact",
      searchTarget: "ticktick://safe-search",
      actions: Object.freeze([descriptors["open-exact"], descriptors.search, descriptors.copy]),
    });
    const item = renderedItem({ model: source });
    const actions = renderedActions(item);

    expect(item.props.title).toBe(source.title);
    expect((item.props.detail.props as { markdown: string }).markdown).toBe(source.detailMarkdown);
    expect(
      renderedMetadata(item)
        .map((label) => label.props.text)
        .join(" ")
    ).toContain(marker);
    expect(actions.find((action) => action.type === Action.CopyToClipboard)?.props.content).toBe(marker);
    expect(
      JSON.stringify(actions.map((action) => ({ title: action.props.title, target: action.props.target })))
    ).not.toContain(marker);
  });

  it("does not mutate or thaw a deeply immutable model", () => {
    const metadata = Object.freeze({
      ...baseMetadata,
      tags: Object.freeze(["one"]),
      checklist: Object.freeze({
        completed: 0,
        total: 1,
        items: Object.freeze([Object.freeze({ title: "One", status: "Open" as const, sortOrder: 1 })]),
      }),
    });
    const actions = Object.freeze([descriptors.complete, descriptors.copy]);
    const source = model({ metadata, actions });
    const before = JSON.stringify(source);

    renderedItem({ model: source, onComplete: vi.fn() });

    expect(JSON.stringify(source)).toBe(before);
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.metadata)).toBe(true);
    expect(Object.isFrozen(source.metadata.tags)).toBe(true);
    expect(Object.isFrozen(source.metadata.checklist)).toBe(true);
    expect(Object.isFrozen(source.actions)).toBe(true);
  });

  it("imports only Raycast, React, and the accepted normalized model", () => {
    const source = readFileSync(resolve(__dirname, "DomainTaskItem.tsx"), "utf8");
    const specifiers = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g), (match) => match[1]).sort();

    expect(specifiers).toEqual(["./domainTaskItemModel", "@raycast/api", "react"]);
    expect(source).not.toMatch(
      /taskItem|\.\.\/service|osScript|TickTickBackend|fetch\(|showToast|Toast|console\.|catch\s*\(/
    );
  });
});
