import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { type ReactElement, type ReactNode } from "react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { CombinedFilterOption, CombinedTaskFilterModel } from "./taskListModel";
import {
  buildCombinedTaskFilterItems,
  CombinedTaskFilter,
  type CombinedTaskFilterItems,
  type CombinedTaskFilterProps,
  type CombinedTaskFilterSelectionHandler,
} from "./CombinedTaskFilter";

vi.mock("@raycast/api", () => ({
  List: {
    Dropdown: Object.assign(
      function MockDropdown() {
        return null;
      },
      {
        Item: function MockDropdownItem() {
          return null;
        },
        Section: function MockDropdownSection() {
          return null;
        },
      }
    ),
  },
}));

const PRIVATE_SEARCH = "PRIVATE-MARKER-search-text";
const RAW_PROJECT_ID = "PRIVATE-MARKER-raw-project-id";

function freezeOption(option: CombinedFilterOption): CombinedFilterOption {
  const selection = option.selection === undefined ? undefined : Object.freeze({ ...option.selection });
  return Object.freeze(
    selection === undefined ? { value: option.value, title: option.title } : { ...option, selection }
  );
}

function model(overrides: Partial<CombinedTaskFilterModel> = {}): CombinedTaskFilterModel {
  const statusOptions = Object.freeze([
    freezeOption({ value: "opaque-status-open", title: "Open", selection: { kind: "status", status: "open" } }),
    freezeOption({
      value: "opaque-status-completed",
      title: "Completed",
      selection: { kind: "status", status: "completed" },
    }),
    freezeOption({ value: "opaque-status-all", title: "All", selection: { kind: "status", status: "all" } }),
  ]);
  const projectOptions = Object.freeze([
    freezeOption({ value: "opaque-project-all", title: "All Projects", selection: { kind: "project" } }),
    freezeOption({
      value: "opaque-project-work",
      title: "Work List",
      selection: { kind: "project", projectId: RAW_PROJECT_ID },
    }),
  ]);
  const base: CombinedTaskFilterModel = {
    value: "filter:current",
    summary: "Completed · Work List",
    current: freezeOption({ value: "filter:current", title: "Completed · Work List" }),
    canonicalFilters: Object.freeze({ searchText: PRIVATE_SEARCH, projectId: RAW_PROJECT_ID, status: "completed" }),
    statusOptions,
    projectOptions,
  };

  return Object.freeze({ ...base, ...overrides });
}

type DropdownProps = Readonly<{
  tooltip: string;
  value: string;
  storeValue?: boolean;
  onChange: (value: string) => void | Promise<void>;
  children?: ReactNode;
}>;

type DropdownItemProps = Readonly<{ title: string; value: string }>;
type DropdownSectionProps = Readonly<{ title: string; children?: ReactNode }>;

function renderFilter(props: CombinedTaskFilterProps): ReactElement<DropdownProps> | null {
  return CombinedTaskFilter(props) as ReactElement<DropdownProps> | null;
}

function directElements(node: ReactNode): ReactElement[] {
  const children = Array.isArray(node) ? node : node === undefined || node === null ? [] : [node];
  return children.filter(
    (child): child is ReactElement => typeof child === "object" && child !== null && "props" in child
  );
}

function sectionItems(section: ReactElement<DropdownSectionProps>): ReactElement<DropdownItemProps>[] {
  return directElements(section.props.children) as ReactElement<DropdownItemProps>[];
}

function allRenderedItems(root: ReactElement<DropdownProps>): ReactElement<DropdownItemProps>[] {
  const [current, statusSection, projectSection] = directElements(root.props.children) as [
    ReactElement<DropdownItemProps>,
    ReactElement<DropdownSectionProps>,
    ReactElement<DropdownSectionProps>
  ];
  return [current, ...sectionItems(statusSection), ...sectionItems(projectSection)];
}

describe("combined task-filter normalization", () => {
  it("exposes a typed async-capable selection callback", () => {
    expectTypeOf<CombinedTaskFilterSelectionHandler>().toEqualTypeOf<(selectedValue: string) => void | Promise<void>>();
  });

  it("copies only current, status, and project display items in model order", () => {
    const input = model();
    const items = buildCombinedTaskFilterItems(input);

    expect(items).toEqual({
      current: { value: "filter:current", title: "Completed · Work List" },
      statusOptions: [
        { value: "opaque-status-open", title: "Open" },
        { value: "opaque-status-completed", title: "Completed" },
        { value: "opaque-status-all", title: "All" },
      ],
      projectOptions: [
        { value: "opaque-project-all", title: "All Projects" },
        { value: "opaque-project-work", title: "Work List" },
      ],
    });
  });

  it("returns deeply frozen output without mutating the immutable model", () => {
    const input = model();
    const statusOptions = input.statusOptions;
    const projectOptions = input.projectOptions;
    const items = buildCombinedTaskFilterItems(input) as CombinedTaskFilterItems;

    expect(Object.isFrozen(items)).toBe(true);
    expect(Object.isFrozen(items.current)).toBe(true);
    expect(Object.isFrozen(items.statusOptions)).toBe(true);
    expect(Object.isFrozen(items.projectOptions)).toBe(true);
    expect(items.statusOptions.every(Object.isFrozen)).toBe(true);
    expect(items.projectOptions.every(Object.isFrozen)).toBe(true);
    expect(input.statusOptions).toBe(statusOptions);
    expect(input.projectOptions).toBe(projectOptions);
    expect(input.canonicalFilters.searchText).toBe(PRIVATE_SEARCH);
  });

  it("snapshots hostile model and option accessors once and never reads canonical filters or selections", () => {
    const stable = model();
    const modelReads = new Map<string, number>();
    const optionReads = new Map<string, number>();
    let canonicalReads = 0;
    let selectionReads = 0;
    const readOnce = <Value>(reads: Map<string, number>, key: string, value: Value): Value => {
      const count = (reads.get(key) ?? 0) + 1;
      reads.set(key, count);
      if (count > 1) throw new Error(`PRIVATE-MARKER-repeat-${key}`);
      return value;
    };
    const hostileStatus = Object.defineProperties(
      {},
      {
        value: {
          enumerable: true,
          get: () => readOnce(optionReads, "value", stable.statusOptions[0].value),
        },
        title: {
          enumerable: true,
          get: () => readOnce(optionReads, "title", stable.statusOptions[0].title),
        },
        selection: {
          enumerable: true,
          get() {
            selectionReads += 1;
            throw new Error("PRIVATE-MARKER-selection-read");
          },
        },
      }
    ) as CombinedFilterOption;
    const statusOptions = Object.freeze([hostileStatus, ...stable.statusOptions.slice(1)]);
    const hostile = Object.defineProperties(
      {},
      {
        value: { enumerable: true, get: () => readOnce(modelReads, "value", stable.value) },
        summary: { enumerable: true, get: () => readOnce(modelReads, "summary", stable.summary) },
        current: { enumerable: true, get: () => readOnce(modelReads, "current", stable.current) },
        statusOptions: { enumerable: true, get: () => readOnce(modelReads, "statuses", statusOptions) },
        projectOptions: {
          enumerable: true,
          get: () => readOnce(modelReads, "projects", stable.projectOptions),
        },
        canonicalFilters: {
          enumerable: true,
          get() {
            canonicalReads += 1;
            throw new Error("PRIVATE-MARKER-canonical-read");
          },
        },
      }
    ) as CombinedTaskFilterModel;

    expect(buildCombinedTaskFilterItems(hostile)).toEqual(buildCombinedTaskFilterItems(stable));
    expect([...modelReads.values()]).toEqual([1, 1, 1, 1, 1]);
    expect([...optionReads.values()]).toEqual([1, 1]);
    expect(canonicalReads).toBe(0);
    expect(selectionReads).toBe(0);
  });

  it.each([
    ["wrong current model value", (base: CombinedTaskFilterModel) => ({ ...base, value: "other" })],
    ["summary mismatch", (base: CombinedTaskFilterModel) => ({ ...base, summary: "Other Summary" })],
    ["missing status array", (base: CombinedTaskFilterModel) => ({ ...base, statusOptions: null })],
    ["empty status array", (base: CombinedTaskFilterModel) => ({ ...base, statusOptions: [] })],
    ["empty project array", (base: CombinedTaskFilterModel) => ({ ...base, projectOptions: [] })],
    [
      "duplicate values across sections",
      (base: CombinedTaskFilterModel) => ({
        ...base,
        projectOptions: [{ ...base.projectOptions[0], value: base.statusOptions[0].value }],
      }),
    ],
    [
      "current value reused by an option",
      (base: CombinedTaskFilterModel) => ({
        ...base,
        statusOptions: [{ ...base.statusOptions[0], value: "filter:current" }],
      }),
    ],
    [
      "blank option value",
      (base: CombinedTaskFilterModel) => ({ ...base, statusOptions: [{ ...base.statusOptions[0], value: "  " }] }),
    ],
    [
      "controlled option value",
      (base: CombinedTaskFilterModel) => ({
        ...base,
        statusOptions: [{ ...base.statusOptions[0], value: "option\u0000value" }],
      }),
    ],
    [
      "blank option title",
      (base: CombinedTaskFilterModel) => ({ ...base, statusOptions: [{ ...base.statusOptions[0], title: " " }] }),
    ],
    [
      "controlled option title",
      (base: CombinedTaskFilterModel) => ({
        ...base,
        projectOptions: [{ ...base.projectOptions[0], title: "title\u0000" }],
      }),
    ],
  ] as const)("fails a malformed runtime-cast model closed: %s", (_name, mutate) => {
    const malformed = mutate(model()) as unknown as CombinedTaskFilterModel;

    expect(() => buildCombinedTaskFilterItems(malformed)).not.toThrow();
    expect(buildCombinedTaskFilterItems(malformed)).toBeUndefined();
    expect(renderFilter({ model: malformed, onSelection: vi.fn() })).toBeNull();
  });

  it("fails throwing model and option accessors closed without reflecting their errors", () => {
    const marker = "PRIVATE-MARKER-hostile-accessor";
    const hostileModel = Object.defineProperty({}, "value", {
      get() {
        throw new Error(marker);
      },
    }) as CombinedTaskFilterModel;
    const stable = model();
    const hostileOption = Object.defineProperty({}, "value", {
      get() {
        throw new Error(marker);
      },
    }) as CombinedFilterOption;
    const hostileOptions = { ...stable, statusOptions: [hostileOption] } as CombinedTaskFilterModel;

    expect(buildCombinedTaskFilterItems(hostileModel)).toBeUndefined();
    expect(buildCombinedTaskFilterItems(hostileOptions)).toBeUndefined();
    expect(JSON.stringify(buildCombinedTaskFilterItems(hostileModel)) ?? "").not.toContain(marker);
  });
});

describe("CombinedTaskFilter", () => {
  it("renders one dropdown with current summary first, then fixed Status and Lists sections", () => {
    const root = renderFilter({ model: model(), onSelection: vi.fn() }) as ReactElement<DropdownProps>;
    const [current, statusSection, projectSection] = directElements(root.props.children) as [
      ReactElement<DropdownItemProps>,
      ReactElement<DropdownSectionProps>,
      ReactElement<DropdownSectionProps>
    ];

    expect(root.props.tooltip).toBe("Filter Tasks");
    expect(root.props.value).toBe("filter:current");
    expect(root.props.storeValue).toBe(false);
    expect(directElements(root.props.children)).toHaveLength(3);
    expect(current.props).toEqual({ title: "Completed · Work List", value: "filter:current" });
    expect(statusSection.props.title).toBe("Status");
    expect(sectionItems(statusSection).map((item) => item.props)).toEqual([
      { title: "Open", value: "opaque-status-open" },
      { title: "Completed", value: "opaque-status-completed" },
      { title: "All", value: "opaque-status-all" },
    ]);
    expect(projectSection.props.title).toBe("Lists");
    expect(sectionItems(projectSection).map((item) => item.props)).toEqual([
      { title: "All Projects", value: "opaque-project-all" },
      { title: "Work List", value: "opaque-project-work" },
    ]);
  });

  it("uses only opaque model values for item keys and values, never raw project IDs", () => {
    const root = renderFilter({ model: model(), onSelection: vi.fn() }) as ReactElement<DropdownProps>;
    const items = allRenderedItems(root);
    const serialized = JSON.stringify(
      items.map((item) => ({ key: item.key, title: item.props.title, value: item.props.value }))
    );

    expect(items.map((item) => item.props.value)).toEqual([
      "filter:current",
      "opaque-status-open",
      "opaque-status-completed",
      "opaque-status-all",
      "opaque-project-all",
      "opaque-project-work",
    ]);
    expect(items.map((item) => item.key)).toEqual(items.map((item) => item.props.value));
    expect(serialized).not.toContain(RAW_PROJECT_ID);
    expect(serialized).not.toContain(PRIVATE_SEARCH);
  });

  it("forwards each recognized non-current selection exactly once and ignores current or unknown values", async () => {
    const onSelection = vi.fn(async () => undefined);
    const root = renderFilter({ model: model(), onSelection }) as ReactElement<DropdownProps>;

    await root.props.onChange("filter:current");
    await root.props.onChange("unknown-value");
    await root.props.onChange("opaque-status-completed");
    await root.props.onChange("opaque-project-work");

    expect(onSelection.mock.calls).toEqual([["opaque-status-completed"], ["opaque-project-work"]]);
  });

  it("propagates callback rejection without embedding the error or selection data in the UI", async () => {
    const marker = "PRIVATE-MARKER-callback-rejection";
    const failure = new Error(marker);
    const onSelection = vi.fn(async () => {
      throw failure;
    });
    const root = renderFilter({ model: model(), onSelection }) as ReactElement<DropdownProps>;

    await expect(root.props.onChange("opaque-project-work")).rejects.toBe(failure);
    expect(onSelection).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(root)).not.toContain(marker);
    expect(JSON.stringify(root)).not.toContain(RAW_PROJECT_ID);
  });

  it("reflects only intended visible model titles, not canonical filters, selections, or extra private fields", () => {
    const marker = "PRIVATE-MARKER-nonvisible-model-data";
    const base = model();
    const privateModel = {
      ...base,
      canonicalFilters: { searchText: marker, projectId: marker, status: "open" },
      statusOptions: base.statusOptions.map((option) => ({ ...option, privateData: marker })),
      projectOptions: base.projectOptions.map((option) => ({
        ...option,
        selection: { kind: "project", projectId: marker },
        privateData: marker,
      })),
      privateData: marker,
    } as unknown as CombinedTaskFilterModel;
    const root = renderFilter({ model: privateModel, onSelection: vi.fn() }) as ReactElement<DropdownProps>;
    const serialized = JSON.stringify(root);

    expect(serialized).toContain("Completed · Work List");
    expect(serialized).toContain("Work List");
    expect(serialized).not.toContain(marker);
  });

  it("keeps the production component free of persistence, backend, network, logging, and filter semantics", () => {
    const source = readFileSync(resolve(__dirname, "CombinedTaskFilter.tsx"), "utf8");

    expect(source).not.toMatch(
      /LocalStorage|taskFilterPreferences|TickTickBackend|TickTickService|fetch\s*\(|console\.|log\s*\(/
    );
    expect(source).not.toMatch(/selection|projectId|canonicalFilters|searchText|status\s*:/);
    expect(source).not.toMatch(/applyCombinedTaskFilterSelection|buildCombinedTaskFilter\s*\(/);
  });
});
