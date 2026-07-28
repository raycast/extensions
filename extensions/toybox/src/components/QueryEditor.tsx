import { KeyValueEditor, type KeyValueEditorProps } from "./KeyValueEditor";

/**
 * Query 键值编辑器。
 *
 * 复用 {@link KeyValueEditor} 编辑 Query 参数列表。
 * 与 URL 的双向同步由父组件 {@link RequestForm} 负责：Query 变化时重建 URL 的
 * search，URL 变化时解析回 Query。本组件只负责编辑列表本身。
 */
export type QueryEditorProps = Omit<KeyValueEditorProps, "title" | "keyLabel" | "valueLabel">;

export function QueryEditor(props: QueryEditorProps) {
  return <KeyValueEditor title="Query 参数" keyLabel="参数名" valueLabel="值" {...props} />;
}
