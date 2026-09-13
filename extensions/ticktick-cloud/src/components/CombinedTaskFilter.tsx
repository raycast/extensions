import { List } from "@raycast/api";
import type { ReactElement } from "react";

import type { CombinedTaskFilterModel } from "./taskListModel";

export type CombinedTaskFilterItem = Readonly<{
  value: string;
  title: string;
}>;

export type CombinedTaskFilterItems = Readonly<{
  current: CombinedTaskFilterItem;
  statusOptions: readonly CombinedTaskFilterItem[];
  projectOptions: readonly CombinedTaskFilterItem[];
}>;

export type CombinedTaskFilterSelectionHandler = (selectedValue: string) => void | Promise<void>;

export type CombinedTaskFilterProps = Readonly<{
  model: CombinedTaskFilterModel;
  onSelection: CombinedTaskFilterSelectionHandler;
}>;

function isWellFormedWithoutControls(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || (codeUnit >= 0x7f && codeUnit <= 0x9f)) return false;

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (!(nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff)) return false;
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }

  return true;
}

function isUsableValue(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    isWellFormedWithoutControls(value) &&
    !Array.from(value).some((character) => /\p{Cf}/u.test(character))
  );
}

function isUsableTitle(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    isWellFormedWithoutControls(value) &&
    !/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(value)
  );
}

function snapshotItem(source: unknown): CombinedTaskFilterItem | undefined {
  if (typeof source !== "object" || source === null || Array.isArray(source)) return undefined;

  const record = source as Record<string, unknown>;
  const valueSnapshot = record.value;
  const titleSnapshot = record.title;
  if (!isUsableValue(valueSnapshot) || !isUsableTitle(titleSnapshot)) return undefined;

  return Object.freeze({ value: valueSnapshot, title: titleSnapshot });
}

function snapshotItems(source: unknown): readonly CombinedTaskFilterItem[] | undefined {
  if (!Array.isArray(source)) return undefined;

  const lengthSnapshot = source.length;
  if (lengthSnapshot === 0) return undefined;

  const items: CombinedTaskFilterItem[] = [];
  for (let index = 0; index < lengthSnapshot; index += 1) {
    const optionSnapshot = source[index];
    const item = snapshotItem(optionSnapshot);
    if (!item) return undefined;
    items.push(item);
  }

  return Object.freeze(items);
}

export function buildCombinedTaskFilterItems(model: CombinedTaskFilterModel): CombinedTaskFilterItems | undefined {
  try {
    const valueSnapshot = model.value;
    const summarySnapshot = model.summary;
    const currentSnapshot = model.current;
    const statusOptionsSnapshot = model.statusOptions;
    const projectOptionsSnapshot = model.projectOptions;

    const current = snapshotItem(currentSnapshot);
    const statusOptions = snapshotItems(statusOptionsSnapshot);
    const projectOptions = snapshotItems(projectOptionsSnapshot);
    if (
      valueSnapshot !== "filter:current" ||
      !isUsableTitle(summarySnapshot) ||
      !current ||
      current.value !== valueSnapshot ||
      current.title !== summarySnapshot ||
      !statusOptions ||
      !projectOptions
    ) {
      return undefined;
    }

    const values = [
      current.value,
      ...statusOptions.map((item) => item.value),
      ...projectOptions.map((item) => item.value),
    ];
    if (new Set(values).size !== values.length) return undefined;

    return Object.freeze({ current, statusOptions, projectOptions });
  } catch {
    return undefined;
  }
}

export function CombinedTaskFilter({ model, onSelection }: CombinedTaskFilterProps): ReactElement | null {
  const items = buildCombinedTaskFilterItems(model);
  if (!items || typeof onSelection !== "function") return null;

  const selectableValues = new Set([
    ...items.statusOptions.map((item) => item.value),
    ...items.projectOptions.map((item) => item.value),
  ]);
  const handleChange = (selectedValue: string): void | Promise<void> => {
    if (selectedValue === "filter:current" || !selectableValues.has(selectedValue)) return;
    return onSelection(selectedValue);
  };

  return (
    <List.Dropdown tooltip="Filter Tasks" value={items.current.value} storeValue={false} onChange={handleChange}>
      <List.Dropdown.Item key={items.current.value} title={items.current.title} value={items.current.value} />
      <List.Dropdown.Section key="status" title="Status">
        {items.statusOptions.map((item) => (
          <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section key="lists" title="Lists">
        {items.projectOptions.map((item) => (
          <List.Dropdown.Item key={item.value} title={item.title} value={item.value} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default CombinedTaskFilter;
