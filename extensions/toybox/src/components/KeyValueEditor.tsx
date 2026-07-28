import { useState } from "react";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";

import type { KeyValuePair } from "../models/types";

/**
 * 通用键值编辑器。
 *
 * 以 `List` 展示条目，通过 `ActionPanel` 提供新增 / 编辑 / 删除 / 启停 / 排序。
 * 新增与编辑单条时 `Action.Push` 到 {@link EntryForm}（一个轻量 `Form`）。
 *
 * Header / Query / FormData 编辑器均复用本组件，仅通过 `title` 与标签区分。
 *
 * 由于本组件作为 `Action.Push` 的独立导航页面，其 `entries` prop 是进入时的快照；
 * 因此内部用 `useState` 维护一份本地副本，所有编辑先更新本地再通过 `onChange`
 * 同步给父组件，确保列表即时刷新且 `pop` 返回时父组件已是最新值。
 */
export interface KeyValueEditorProps {
  /** 区段标题，如 "Headers" / "Query"。 */
  title: string;
  /** Key 字段的中文标签。 */
  keyLabel: string;
  /** Value 字段的中文标签。 */
  valueLabel: string;
  entries: KeyValuePair[];
  onChange: (next: KeyValuePair[]) => void;
}

export function KeyValueEditor({ title, keyLabel, valueLabel, entries, onChange }: KeyValueEditorProps) {
  const navigation = useNavigation();
  const [local, setLocal] = useState<KeyValuePair[]>(entries);

  /** 更新本地副本并同步给父组件。 */
  const update = (next: KeyValuePair[]): void => {
    setLocal(next);
    onChange(next);
  };

  const addEntry = (): void => {
    navigation.push(
      <EntryForm title={`新增${title}`} keyLabel={keyLabel} valueLabel={valueLabel} onSubmit={handleSubmitNew} />,
    );
  };

  const editEntry = (index: number): void => {
    navigation.push(
      <EntryForm
        title={`编辑${title}`}
        keyLabel={keyLabel}
        valueLabel={valueLabel}
        initial={local[index]}
        onSubmit={(entry) => handleSubmitEdit(index, entry)}
      />,
    );
  };

  const handleSubmitNew = (entry: KeyValuePair): void => {
    update([...local, entry]);
    navigation.pop();
  };

  const handleSubmitEdit = (index: number, entry: KeyValuePair): void => {
    update(local.map((e, i) => (i === index ? entry : e)));
    navigation.pop();
  };

  const removeEntry = (index: number): void => {
    update(local.filter((_, i) => i !== index));
  };

  const toggleEntry = (index: number): void => {
    update(local.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e)));
  };

  const moveUp = (index: number): void => {
    if (index <= 0) return;
    const next = [...local];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    update(next);
  };

  const moveDown = (index: number): void => {
    if (index >= local.length - 1) return;
    const next = [...local];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    update(next);
  };

  return (
    <List searchBarPlaceholder={`搜索${title}…`}>
      <List.Section title={`${title}（${local.length}）`}>
        {local.map((entry, index) => (
          <List.Item
            key={`${index}-${entry.key}`}
            icon={entry.enabled ? Icon.Checkmark : Icon.Circle}
            title={entry.key || "（空）"}
            subtitle={entry.value}
            actions={
              <ActionPanel>
                <Action title="编辑" icon={Icon.Pencil} onAction={() => editEntry(index)} />
                <Action
                  title={entry.enabled ? "禁用" : "启用"}
                  icon={Icon.Switch}
                  onAction={() => toggleEntry(index)}
                />
                <Action
                  title="上移"
                  icon={Icon.ArrowUp}
                  onAction={() => moveUp(index)}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                />
                <Action
                  title="下移"
                  icon={Icon.ArrowDown}
                  onAction={() => moveDown(index)}
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                />
                <Action
                  title="删除"
                  icon={Icon.Trash}
                  onAction={() => removeEntry(index)}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Item
        icon={Icon.Plus}
        title={`新增${title}`}
        actions={
          <ActionPanel>
            <Action title="新增" icon={Icon.Plus} onAction={addEntry} />
          </ActionPanel>
        }
      />
    </List>
  );
}

/** 单条键值的编辑表单（非受控，提交后回调）。 */
interface EntryFormProps {
  title: string;
  keyLabel: string;
  valueLabel: string;
  initial?: KeyValuePair;
  onSubmit: (entry: KeyValuePair) => void;
}

function EntryForm({ title, keyLabel, valueLabel, initial, onSubmit }: EntryFormProps) {
  const navigation = useNavigation();
  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存"
            icon={Icon.Checkmark}
            onSubmit={(values: { key?: string; value?: string; enabled?: boolean }) => {
              onSubmit({
                key: values.key ?? "",
                value: values.value ?? "",
                enabled: values.enabled ?? true,
              });
              navigation.pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title={keyLabel} defaultValue={initial?.key ?? ""} placeholder={`${keyLabel}…`} />
      <Form.TextField
        id="value"
        title={valueLabel}
        defaultValue={initial?.value ?? ""}
        placeholder={`${valueLabel}…`}
      />
      <Form.Checkbox id="enabled" label="启用" defaultValue={initial?.enabled ?? true} />
    </Form>
  );
}
