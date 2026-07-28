import { Form } from "@raycast/api";

import type { RequestModel } from "../models/request";
import type { BodyType } from "../models/types";

/**
 * Body 编辑器（嵌入 {@link RequestForm} 的 Form 内）。
 *
 * 根据 BodyType 切换渲染：
 * - `none`：不渲染输入；
 * - `json` / `raw`：渲染 `Form.TextArea`；
 * - `formData` / `urlencoded`：渲染摘要，具体键值通过父组件的 Action.Push
 *   进入 `KeyValueEditor` 编辑（因为表单内无法直接嵌入动态增删行）。
 */
export interface BodyEditorProps {
  request: RequestModel;
  /** 局部更新请求模型。 */
  onPatch: (patch: Partial<RequestModel>) => void;
}

const BODY_TYPES: { value: BodyType; title: string }[] = [
  { value: "none", title: "None" },
  { value: "json", title: "JSON" },
  { value: "formData", title: "FormData (multipart)" },
  { value: "urlencoded", title: "x-www-form-urlencoded" },
  { value: "raw", title: "Raw Text" },
];

export function BodyEditor({ request, onPatch }: BodyEditorProps) {
  const activeFormCount = request.formData.filter((f) => f.enabled && f.key.trim() !== "").length;

  return (
    <>
      <Form.Dropdown
        id="bodyType"
        title="Body 类型"
        value={request.bodyType}
        onChange={(value) => onPatch({ bodyType: value as BodyType })}
      >
        {BODY_TYPES.map((t) => (
          <Form.Dropdown.Item key={t.value} value={t.value} title={t.title} />
        ))}
      </Form.Dropdown>

      {request.bodyType === "json" ? (
        <Form.TextArea
          id="body"
          title="JSON"
          value={request.body}
          onChange={(value) => onPatch({ body: value })}
          placeholder='{"key": "value"}'
        />
      ) : null}

      {request.bodyType === "raw" ? (
        <Form.TextArea
          id="body"
          title="Body"
          value={request.body}
          onChange={(value) => onPatch({ body: value })}
          placeholder="请求体文本"
        />
      ) : null}

      {request.bodyType === "formData" || request.bodyType === "urlencoded" ? (
        <Form.Description title="表单数据" text={`${activeFormCount} 条已启用（在 Action 中编辑）`} />
      ) : null}
    </>
  );
}
