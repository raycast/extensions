import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { Project } from "../domain/project";
import type { Task, TaskKind, TaskPriority, TaskStatus } from "../domain/task";
import type { BackendCapabilities } from "../infrastructure/backend/TickTickBackend";
import type { TaskExactLinkStrategy } from "./taskActions";
import { buildDomainTaskItemModel, type DomainTaskItemModel, type DomainTaskItemMetadata } from "./domainTaskItemModel";

const inbox: Project = { id: "project-inbox", name: "Inbox", kind: "inbox", closed: false };
const work: Project = { id: "project-work", name: "Work", kind: "project", closed: false };

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-id",
    projectId: inbox.id,
    projectName: inbox.name,
    title: "Ship the extension",
    status: "open",
    priority: 0,
    tags: [],
    kind: "TEXT",
    isAllDay: false,
    isFloating: false,
    timeZone: "UTC",
    ...overrides,
  };
}

function capabilities(overrides: Partial<BackendCapabilities> = {}): BackendCapabilities {
  return {
    create: false,
    update: false,
    complete: false,
    reopen: false,
    move: false,
    completedQuery: false,
    inboxQuery: false,
    exactTaskLink: false,
    ...overrides,
  };
}

function build(
  source = task(),
  projects: readonly Project[] = [inbox, work],
  caps = capabilities(),
  strategy: TaskExactLinkStrategy = undefined,
  uiTimeZone = "America/Denver"
): DomainTaskItemModel {
  return buildDomainTaskItemModel(source, projects, caps, strategy, uiTimeZone);
}

function actionKeys(model: DomainTaskItemModel): string[] {
  return model.actions.map((action) => action.key);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("normalized row identity and metadata", () => {
  it("builds the baseline normalized row without retaining domain objects", () => {
    const model = build();

    expectTypeOf(model).toEqualTypeOf<DomainTaskItemModel>();
    expectTypeOf(model.metadata).toEqualTypeOf<DomainTaskItemMetadata>();
    expect(model).toMatchObject({
      rowId: JSON.stringify([inbox.id, "task-id"]),
      title: "Ship the extension",
      detailMarkdown: "# Ship the extension",
      copyText: "Ship the extension",
      metadata: {
        project: "Inbox",
        status: "Open",
        priority: "None",
        kind: "Task",
        tags: [],
      },
    });
    expect(model).not.toHaveProperty("task");
    expect(model.metadata).not.toHaveProperty("date");
    expect(model.metadata).not.toHaveProperty("checklist");
  });

  it("uses the composite project/task reference as collision-free JSON row identity", () => {
    const first = build(task({ id: "duplicate", projectId: inbox.id }));
    const second = build(task({ id: "duplicate", projectId: work.id, projectName: work.name }));

    expect(first.rowId).toBe('["project-inbox","duplicate"]');
    expect(second.rowId).toBe('["project-work","duplicate"]');
    expect(first.rowId).not.toBe(second.rowId);
  });

  it("uses the authoritative project name, task snapshot fallback, then a safe fixed fallback", () => {
    expect(build(task({ projectName: "Stale Inbox" })).metadata.project).toBe("Inbox");
    expect(build(task({ projectId: "missing", projectName: "Snapshot List" })).metadata.project).toBe("Snapshot List");
    expect(build(task({ projectId: "missing", projectName: " \t\n " })).metadata.project).toBe("Unknown List");
  });

  it.each([
    ["open", "Open"],
    ["completed", "Completed"],
  ] as const)("maps %s status metadata", (status: TaskStatus, expected) => {
    expect(build(task({ status })).metadata.status).toBe(expected);
  });

  it.each([
    [0, "None"],
    [1, "Low"],
    [3, "Medium"],
    [5, "High"],
  ] as const)("maps priority %s metadata", (priority: TaskPriority, expected) => {
    expect(build(task({ priority })).metadata.priority).toBe(expected);
  });

  it.each([
    ["TEXT", "Task"],
    ["CHECKLIST", "Checklist"],
    ["NOTE", "Note"],
  ] as const)("maps %s kind metadata", (kind: TaskKind, expected) => {
    expect(build(task({ kind })).metadata.kind).toBe(expected);
  });

  it("uses a fixed title fallback only when sanitized display text is blank", () => {
    expect(build(task({ title: " \t\r\n\u0000 " })).title).toBe("Untitled Task");
    expect(build(task({ title: "bad\ud800title" })).title).toBe("bad�title");
  });

  it("preserves tag order while returning safe plain metadata", () => {
    const model = build(task({ tags: ["first", "bad\u0000tag", "third", "  "] }));

    expect(model.metadata.tags).toEqual(["first", "bad tag", "third"]);
  });
});

describe("checklist and copy modeling", () => {
  it("sorts checklist metadata on a copy and preserves the domain item order", () => {
    const source = task({
      kind: "CHECKLIST",
      items: [
        { id: "later", title: "Later", status: "completed", sortOrder: 20 },
        { id: "first", title: "First", status: "open", sortOrder: 10 },
        { id: "same", title: "Same order", status: "completed", sortOrder: 20 },
      ],
    });
    const originalOrder = source.items!.map((item) => item.id);
    const model = build(source);

    expect(model.metadata.checklist).toEqual({
      completed: 2,
      total: 3,
      items: [
        { title: "First", status: "Open", sortOrder: 10 },
        { title: "Later", status: "Completed", sortOrder: 20 },
        { title: "Same order", status: "Completed", sortOrder: 20 },
      ],
    });
    expect(source.items!.map((item) => item.id)).toEqual(originalOrder);
  });

  it("creates literal detail Markdown and plain copy text from content, description, and checklist items", () => {
    const model = build(
      task({
        title: "Copy me",
        kind: "CHECKLIST",
        content: "Body",
        description: "Description",
        items: [
          { id: "one", title: "First", status: "open", sortOrder: 1 },
          { id: "two", title: "Second", status: "completed", sortOrder: 2 },
        ],
      })
    );

    expect(model.detailMarkdown).toBe(
      "# Copy me\n\n## Content\n\nBody\n\n## Description\n\nDescription\n\n## Checklist\n\n- [ ] First\n- [x] Second"
    );
    expect(model.copyText).toBe("Copy me\n\nBody\n\nDescription\n\n☐ First\n☑ Second");
  });

  it("falls back checklist item titles without mutating the source", () => {
    const source = task({
      kind: "CHECKLIST",
      items: [{ id: "blank", title: "\u0000\t", status: "open", sortOrder: 0 }],
    });
    const before = structuredClone(source);

    expect(build(source).metadata.checklist?.items[0].title).toBe("Untitled Checklist Item");
    expect(source).toEqual(before);
  });
});

describe("Markdown and text safety", () => {
  it("escapes images, links, autolinks, raw HTML, entities, and every CommonMark punctuation character", () => {
    const payload =
      '![image](https://evil.example/a.png) [link](https://evil.example) <https://evil.example> <img src="https://evil.example/x"> &copy; # > * _ ` ~ | \\ {} + - . !';
    const model = build(
      task({
        title: payload,
        content: payload,
        description: payload,
        kind: "CHECKLIST",
        items: [{ id: "item", title: payload, status: "open", sortOrder: 0 }],
      })
    );

    expect(model.detailMarkdown).toContain("\\!\\[image\\]\\(https\\:\\/\\/evil\\.example\\/a\\.png\\)");
    expect(model.detailMarkdown).toContain('\\<img src\\=\\"https\\:\\/\\/evil\\.example\\/x\\"\\>');
    expect(model.detailMarkdown).toContain("\\&copy\\;");
    expect(model.detailMarkdown).not.toContain("![image]");
    expect(model.detailMarkdown).not.toContain("](https://");
    expect(model.detailMarkdown).not.toContain("<https://");
    expect(model.detailMarkdown).not.toMatch(/(^|[^\\])<img/iu);
    expect(model.detailMarkdown).not.toContain("&copy;");
    expect(model.detailMarkdown).not.toContain("https://evil.example");
  });

  it("removes controls and replaces unpaired surrogates without throwing or leaving unsafe code units", () => {
    const model = build(
      task({
        title: "Safe\u0000 title \ud800",
        content: "Line\u0085 control \udc00 end",
        description: "Bidi\u202econtrol",
        tags: ["tag\u001fvalue"],
      })
    );
    const serialized = JSON.stringify(model);
    const containsUnsafeCodeUnit = Array.from(serialized).some((character) => {
      const codeUnit = character.charCodeAt(0);
      return (
        codeUnit <= 0x1f ||
        (codeUnit >= 0x7f && codeUnit <= 0x9f) ||
        codeUnit === 0x202e ||
        (codeUnit >= 0xd800 && codeUnit <= 0xdfff)
      );
    });

    expect(model.title).toBe("Safe title �");
    expect(model.detailMarkdown).toContain("�");
    expect(containsUnsafeCodeUnit).toBe(false);
  });

  it("filters astral Unicode C-category format code points after assembling each surrogate pair", () => {
    const formatCharacters = [0x1bca0, 0x1d173, 0xe0001].map((codePoint) => String.fromCodePoint(codePoint));
    const injected = formatCharacters.join("");
    const source = task({
      title: `Title${injected} Safe`,
      projectName: `Snapshot${injected} List`,
      content: `Content${injected} Safe`,
      description: `Description${injected} Safe`,
      tags: [`Tag${injected} Safe`],
      kind: "CHECKLIST",
      items: [{ id: "item", title: `Item${injected} Safe`, status: "open", sortOrder: 0 }],
    });
    const model = build(source, []);
    const visibleText = JSON.stringify({
      title: model.title,
      detailMarkdown: model.detailMarkdown,
      copyText: model.copyText,
      metadata: model.metadata,
    });

    expect(model.title).toBe("Title Safe");
    expect(model.metadata.project).toBe("Snapshot List");
    expect(model.metadata.tags).toEqual(["Tag Safe"]);
    expect(model.metadata.checklist?.items[0].title).toBe("Item Safe");
    expect(model.detailMarkdown).toMatch(/Content +Safe/u);
    expect(model.copyText).toMatch(/Description +Safe/u);
    for (const character of formatCharacters) expect(visibleText).not.toContain(character);
    expect(model.searchTarget).toBeUndefined();
    expect(actionKeys(model)).not.toContain("search");
  });

  it("performs no network or logging side effects for hostile text", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    build(task({ title: "<img src=https://evil.example>", startDate: "not-a-date" }), [], capabilities());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

describe("date display semantics", () => {
  it("keeps all-day display on the task time-zone wall date", () => {
    const model = build(
      task({
        isAllDay: true,
        startDate: "2026-03-08T00:00:00",
        dueDate: "2026-03-09T00:00:00",
        timeZone: "America/New_York",
      }),
      [inbox],
      capabilities(),
      undefined,
      "Asia/Tokyo"
    );

    expect(model.metadata.date).toEqual({
      mode: "all-day",
      timeZone: "America/New_York",
      start: "Mar 8, 2026",
      due: "Mar 9, 2026",
    });
  });

  it("keeps floating time on the task zone across the spring DST boundary", () => {
    const model = build(
      task({
        isFloating: true,
        startDate: "2026-03-08T09:30:00",
        timeZone: "America/New_York",
      }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(model.metadata.date).toEqual({
      mode: "floating",
      timeZone: "America/New_York",
      start: "Mar 8, 2026 at 9:30 AM EDT",
    });
  });

  it("renders bound timed instants in the injected UI zone across spring and fall DST", () => {
    const spring = build(
      task({ startDate: "2026-03-08T09:30:00Z", timeZone: "UTC" }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );
    const fall = build(
      task({ startDate: "2026-11-01T08:30:00Z", timeZone: "UTC" }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(spring.metadata.date).toEqual({
      mode: "bound",
      timeZone: "America/Denver",
      start: "Mar 8, 2026 at 3:30 AM MDT",
    });
    expect(fall.metadata.date).toEqual({
      mode: "bound",
      timeZone: "America/Denver",
      start: "Nov 1, 2026 at 1:30 AM MST",
    });
  });

  it("orders bound ranges by absolute instant even when the displayed fold wall clock moves backwards", () => {
    const model = build(
      task({
        startDate: "2026-11-01T01:30:00-06:00",
        dueDate: "2026-11-01T01:15:00-07:00",
        timeZone: "America/Denver",
      }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(model.metadata.date).toEqual({
      mode: "bound",
      timeZone: "America/Denver",
      start: "Nov 1, 2026 at 1:30 AM MDT",
      due: "Nov 1, 2026 at 1:15 AM MST",
    });
  });

  it("rejects a floating fold range whose task-zone wall-clock tuple moves backwards", () => {
    const model = build(
      task({
        isFloating: true,
        startDate: "2026-11-01T01:30:00-06:00",
        dueDate: "2026-11-01T01:15:00-07:00",
        timeZone: "America/Denver",
      }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(model.metadata.date).toBeUndefined();
  });

  it("preserves valid explicit fold offsets and display while ordering floating wall time", () => {
    const model = build(
      task({
        isFloating: true,
        startDate: "2026-11-01T01:15:00-06:00",
        dueDate: "2026-11-01T01:30:00-07:00",
        timeZone: "America/Denver",
      }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(model.metadata.date).toEqual({
      mode: "floating",
      timeZone: "America/Denver",
      start: "Nov 1, 2026 at 1:15 AM MDT",
      due: "Nov 1, 2026 at 1:30 AM MST",
    });
  });

  it("orders all-day ranges only by task-zone calendar date", () => {
    const model = build(
      task({
        isAllDay: true,
        startDate: "2026-06-01T23:30:00-06:00",
        dueDate: "2026-06-01T01:15:00-07:00",
        timeZone: "America/Denver",
      }),
      [inbox],
      capabilities(),
      undefined,
      "Asia/Tokyo"
    );

    expect(model.metadata.date).toEqual({
      mode: "all-day",
      timeZone: "America/Denver",
      start: "Jun 1, 2026",
      due: "Jun 1, 2026",
    });
  });

  it.each([
    ["bound", { isAllDay: false, isFloating: false }],
    ["floating", { isAllDay: false, isFloating: true }],
    ["all-day", { isAllDay: true, isFloating: false }],
  ] as const)("rejects an offsetless local DST gap for %s dates instead of normalizing it", (_name, flags) => {
    const model = build(
      task({
        ...flags,
        startDate: "2026-03-08T02:30:00",
        timeZone: "America/Denver",
      }),
      [inbox],
      capabilities(),
      undefined,
      "America/Denver"
    );

    expect(model.metadata.date).toBeUndefined();
  });

  it.each([
    ["invalid date", { startDate: "not-a-date" }, "America/Denver"],
    ["invalid task zone", { startDate: "2026-03-08T09:30:00Z", timeZone: "Private/Invalid" }, "America/Denver"],
    ["invalid UI zone", { startDate: "2026-03-08T09:30:00Z" }, "Private/Invalid"],
    ["backwards range", { startDate: "2026-03-09T09:30:00Z", dueDate: "2026-03-08T09:30:00Z" }, "America/Denver"],
  ] as const)("omits date metadata for %s without throwing", (_name, overrides, uiTimeZone) => {
    expect(() => build(task(overrides), [inbox], capabilities(), undefined, uiTimeZone)).not.toThrow();
    expect(build(task(overrides), [inbox], capabilities(), undefined, uiTimeZone).metadata.date).toBeUndefined();
  });
});

describe("targets and action consistency", () => {
  const exactUrl = "https://ticktick.com/webapp/#p/project-inbox/tasks/task-id";

  it.each([
    ["backend-url", capabilities({ exactTaskLink: true }), exactUrl],
    ["backend-url", capabilities({ exactTaskLink: false }), undefined],
    ["native-project-uri", capabilities(), "ticktick://widget.view.task.in.project/project-inbox/task-id"],
    [undefined, capabilities({ exactTaskLink: true }), undefined],
  ] as const)("constructs exact target only for an explicitly qualified %s strategy", (strategy, caps, expected) => {
    const model = build(task({ exactUrl }), [inbox], caps, strategy);

    expect(model.exactTarget).toBe(expected);
    expect(actionKeys(model).includes("open-exact")).toBe(expected !== undefined);
  });

  it("never falls back from a rejected exact URL to a mislabeled exact action", () => {
    const model = build(
      task({ exactUrl: "https://attacker.example/task-id", title: "Duplicate title" }),
      [inbox],
      capabilities({ exactTaskLink: true }),
      "backend-url"
    );

    expect(model.exactTarget).toBeUndefined();
    expect(model.searchTarget).toBe("ticktick://v1/search?keyword=Duplicate%20title");
    expect(actionKeys(model)).not.toContain("open-exact");
    expect(model.actions.find((action) => action.key === "search")?.title).toBe("Search in TickTick");
  });

  it.each(["", " \t\n ", "unsafe\u0000title", "bad\ud800title", "bidi\u202etitle"])(
    "omits an unsafe search target and its action for title %j",
    (title) => {
      const model = build(task({ title }));

      expect(model.searchTarget).toBeUndefined();
      expect(actionKeys(model)).not.toContain("search");
      expect(actionKeys(model)).toEqual(["copy", "refresh"]);
    }
  );

  it("gates mutation actions with capabilities and task status", () => {
    const open = build(task(), [inbox], capabilities({ complete: true, reopen: true, update: true, move: true }));
    const completed = build(
      task({ status: "completed" }),
      [inbox],
      capabilities({ complete: true, reopen: true, update: true, move: true })
    );
    const none = build(task(), [inbox], capabilities());

    expect(actionKeys(open)).toEqual(["complete", "edit", "move", "search", "copy", "refresh"]);
    expect(actionKeys(completed)).toEqual(["reopen", "edit", "move", "search", "copy", "refresh"]);
    expect(actionKeys(none)).toEqual(["search", "copy", "refresh"]);
  });

  it("keeps action descriptors free of every task/project/user marker", () => {
    const marker = "PRIVATE-MARKER-ROW-91e8";
    const model = build(
      task({
        id: `${marker}-id`,
        projectId: `${marker}-project`,
        projectName: `${marker}-project-name`,
        title: `${marker}-title`,
        content: `${marker}-content`,
        exactUrl: `https://ticktick.com/${marker}`,
        tags: [`${marker}-tag`],
      }),
      [{ id: `${marker}-project`, name: `${marker}-catalog`, kind: "project", closed: false }],
      capabilities({ complete: true, update: true, move: true, exactTaskLink: true }),
      "backend-url"
    );

    expect(JSON.stringify(model.actions)).not.toContain(marker);
  });
});

describe("purity, immutability, and dependency boundary", () => {
  it("returns a deeply immutable model without freezing or mutating task, projects, capabilities, tags, or items", () => {
    const source = task({
      tags: ["one", "two"],
      kind: "CHECKLIST",
      items: [
        { id: "two", title: "Two", status: "open", sortOrder: 2 },
        { id: "one", title: "One", status: "completed", sortOrder: 1 },
      ],
    });
    const projects = [work, inbox];
    const caps = capabilities({ complete: true });
    const before = structuredClone({ source, projects, caps });
    const model = build(source, projects, caps);

    expect({ source, projects, caps }).toEqual(before);
    expect(Object.isFrozen(source)).toBe(false);
    expect(Object.isFrozen(source.tags)).toBe(false);
    expect(Object.isFrozen(source.items)).toBe(false);
    expect(Object.isFrozen(projects)).toBe(false);
    expect(Object.isFrozen(caps)).toBe(false);
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.metadata)).toBe(true);
    expect(Object.isFrozen(model.metadata.tags)).toBe(true);
    expect(Object.isFrozen(model.metadata.checklist)).toBe(true);
    expect(Object.isFrozen(model.metadata.checklist?.items)).toBe(true);
    expect(model.metadata.checklist?.items.every((item) => Object.isFrozen(item))).toBe(true);
    expect(Object.isFrozen(model.actions)).toBe(true);
    expect(Reflect.set(model.metadata, "project", "Changed")).toBe(false);
  });

  it("has no Raycast, service, legacy task utility, network, storage, or logging imports", () => {
    const source = readFileSync(resolve(__dirname, "domainTaskItemModel.ts"), "utf8");

    expect(source).not.toMatch(/@raycast|\.\.\/service|service\/task|utils\/date|LocalStorage|fetch\(|console\./);
  });
});
