import { KeyValueEditor, type KeyValueEditorProps } from "./KeyValueEditor";

/**
 * Headers 键值编辑器。
 *
 * 复用 {@link KeyValueEditor}，固定标题与标签为 Header 语义。
 */
export type HeaderEditorProps = Omit<KeyValueEditorProps, "title" | "keyLabel" | "valueLabel">;

export function HeaderEditor(props: HeaderEditorProps) {
  return <KeyValueEditor title="Header" keyLabel="Header 名" valueLabel="值" {...props} />;
}
