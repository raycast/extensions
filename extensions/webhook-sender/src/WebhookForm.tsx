import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useCallback, useState } from "react";
import { HttpMethod, KeyValueField, SavedWebhook, ValueType, WebhookRequest } from "./types";
import { addHistory, saveWebhook } from "./storage";
import { emptyField, fieldsToJson, generateId, sendWebhook } from "./utils";
import { ResponseView } from "./ResponseView";

interface Props {
  initial?: Partial<WebhookRequest>;
  onSent?: () => void;
  initialSavedId?: string;
  initialSavedName?: string;
}

const HTTP_METHODS: HttpMethod[] = ["POST", "GET", "PUT", "PATCH", "DELETE"];

export function WebhookForm({ initial, onSent, initialSavedId, initialSavedName }: Props) {
  const { push } = useNavigation();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [method, setMethod] = useState<HttpMethod>(initial?.method ?? "POST");
  const [bodyMode, setBodyMode] = useState<"key-value" | "raw">(initial?.bodyMode ?? "key-value");
  const [fields, setFields] = useState<KeyValueField[]>(
    initial?.fields && initial.fields.length > 0 ? initial.fields : [emptyField()],
  );
  const [rawJson, setRawJson] = useState(initial?.rawJson ?? "");
  const [saveName, setSaveName] = useState(initialSavedName ?? "");
  const [isSending, setIsSending] = useState(false);
  const [fieldToRemove, setFieldToRemove] = useState<string>("");

  const hasBody = method !== "GET" && method !== "DELETE";

  const updateField = useCallback((id: string, patch: Partial<KeyValueField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const addField = useCallback(() => {
    setFields((prev) => [...prev, emptyField()]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id);
      return next.length === 0 ? [emptyField()] : next;
    });
    setFieldToRemove("");
  }, []);

  const handleRemoveSelected = useCallback(() => {
    if (fieldToRemove) {
      removeField(fieldToRemove);
    } else if (fields.length > 1) {
      // fallback: remove last field
      removeField(fields[fields.length - 1].id);
    }
  }, [fieldToRemove, fields, removeField]);

  const buildRequest = (): WebhookRequest => ({
    url,
    method,
    bodyMode,
    fields,
    rawJson,
  });

  const handleSend = useCallback(async () => {
    if (!url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        await showToast({
          style: Toast.Style.Failure,
          title: "URL must start with http:// or https://",
        });
        return;
      }
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      return;
    }

    if (bodyMode === "raw" && rawJson.trim()) {
      try {
        JSON.parse(rawJson);
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid JSON in body",
          message: "Please check your raw JSON",
        });
        return;
      }
    }

    setIsSending(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Sending webhook…",
    });

    const request = buildRequest();

    try {
      const result = await sendWebhook(request);

      await addHistory({
        id: generateId(),
        timestamp: Date.now(),
        request,
        responseStatus: result.status,
        responseBody: result.body,
        responseTime: result.responseTime,
      });

      await toast.hide();
      onSent?.();

      push(
        <ResponseView status={result.status} body={result.body} responseTime={result.responseTime} request={request} />,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await addHistory({
        id: generateId(),
        timestamp: Date.now(),
        request,
        error: message,
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Request failed",
        message,
      });

      onSent?.();
    } finally {
      setIsSending(false);
    }
  }, [url, method, bodyMode, fields, rawJson, onSent, push]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter a name to save",
      });
      return;
    }
    if (!url.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "URL is required" });
      return;
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        await showToast({
          style: Toast.Style.Failure,
          title: "URL must start with http:// or https://",
        });
        return;
      }
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Invalid URL" });
      return;
    }

    const webhook: SavedWebhook = {
      id: initialSavedId ?? generateId(),
      name: saveName.trim(),
      createdAt: Date.now(),
      request: buildRequest(),
    };

    await saveWebhook(webhook);
    await showToast({
      style: Toast.Style.Success,
      title: `Saved "${webhook.name}"`,
    });
    setSaveName("");
    onSent?.();
  }, [saveName, url, method, bodyMode, fields, rawJson, onSent, initialSavedId, initialSavedName]);

  const jsonPreview = (() => {
    if (!hasBody) return "";
    if (bodyMode === "raw") return rawJson;
    const obj = fieldsToJson(fields);
    if (Object.keys(obj).length === 0) return "";
    return JSON.stringify(obj, null, 2);
  })();

  return (
    <Form
      navigationTitle="Send Webhook"
      isLoading={isSending}
      actions={
        <ActionPanel>
          <Action title="Send Webhook" icon={Icon.ArrowRight} onAction={handleSend} />
          <Action
            title="Save Webhook"
            icon={Icon.Bookmark}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={handleSave}
          />
          {bodyMode === "key-value" && hasBody && (
            <Action
              title="Add Field"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={addField}
            />
          )}
          {bodyMode === "key-value" && hasBody && fields.length > 1 && (
            <Action
              title={fieldToRemove ? "Remove Selected Field" : "Remove Last Field"}
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              style={Action.Style.Destructive}
              onAction={handleRemoveSelected}
            />
          )}
        </ActionPanel>
      }
    >
      {/* ── URL & Method ── */}
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://example.com/webhook"
        value={url}
        onChange={setUrl}
        autoFocus
      />

      <Form.Dropdown id="method" title="Method" value={method} onChange={(v) => setMethod(v as HttpMethod)}>
        {HTTP_METHODS.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={m} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {/* ── Body ── */}
      {hasBody && (
        <>
          <Form.Dropdown
            id="bodyMode"
            title="Body Type"
            value={bodyMode}
            onChange={(v) => setBodyMode(v as "key-value" | "raw")}
          >
            <Form.Dropdown.Item value="key-value" title="Key-Value Fields" />
            <Form.Dropdown.Item value="raw" title="Raw JSON" />
          </Form.Dropdown>

          {bodyMode === "key-value" ? (
            <>
              {fields.map((field) => (
                <KeyValueRow key={field.id} field={field} onChange={(patch) => updateField(field.id, patch)} />
              ))}
              {fields.length > 1 && (
                <Form.Dropdown
                  id="fieldToRemove"
                  title="Remove Field"
                  value={fieldToRemove}
                  onChange={setFieldToRemove}
                  info="Select a field then press ⌘⇧D to remove it"
                >
                  <Form.Dropdown.Item value="" title="— select field to remove —" />
                  {fields.map((f, idx) => (
                    <Form.Dropdown.Item
                      key={f.id}
                      value={f.id}
                      title={f.key ? `Field ${idx + 1}: "${f.key}"` : `Field ${idx + 1} (empty)`}
                    />
                  ))}
                </Form.Dropdown>
              )}
              <Form.Description
                title=""
                text={`⌘N  add field${fields.length > 1 ? "  ·  ⌘⇧D  remove selected field" : ""}`}
              />
              {jsonPreview && <Form.Description title="JSON Preview" text={jsonPreview} />}
            </>
          ) : (
            <Form.TextArea
              id="rawJson"
              title="JSON Body"
              placeholder={'{\n  "key": "value"\n}'}
              value={rawJson}
              onChange={setRawJson}
              enableMarkdown={false}
            />
          )}
        </>
      )}

      <Form.Separator />

      {/* ── Save ── */}
      <Form.TextField
        id="saveName"
        title="Save As (optional)"
        placeholder="e.g. New Webhook for Project X"
        value={saveName}
        onChange={setSaveName}
      />
      <Form.Description title="" text="Give this webhook a name and press ⌘S to save it for later" />
    </Form>
  );
}

interface RowProps {
  field: KeyValueField;
  onChange: (patch: Partial<KeyValueField>) => void;
}

function KeyValueRow({ field, onChange }: RowProps) {
  const typeSuffix =
    field.type === "boolean" ? " (bool)" : field.type === "number" ? " (num)" : field.type === "null" ? " (null)" : "";

  return (
    <>
      <Form.TextField
        id={`key-${field.id}`}
        title="Key"
        placeholder="attribute name"
        value={field.key}
        onChange={(v) => onChange({ key: v })}
      />
      <Form.TextField
        id={`value-${field.id}`}
        title={`Value${typeSuffix}`}
        placeholder={
          field.type === "boolean"
            ? "true or false"
            : field.type === "number"
              ? "42"
              : field.type === "null"
                ? "(null — no value needed)"
                : "value"
        }
        value={field.value}
        onChange={(v) => onChange({ value: v })}
      />
      <Form.Dropdown
        id={`type-${field.id}`}
        title="Type"
        value={field.type}
        onChange={(v) => onChange({ type: v as ValueType })}
      >
        <Form.Dropdown.Item value="string" title={`"string"`} />
        <Form.Dropdown.Item value="boolean" title="boolean (true/false)" />
        <Form.Dropdown.Item value="number" title="number (42, 3.14)" />
        <Form.Dropdown.Item value="null" title="null" />
      </Form.Dropdown>
      <Form.Separator />
    </>
  );
}
