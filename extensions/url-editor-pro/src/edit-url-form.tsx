import { Form, ActionPanel, Action, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrDetail, buildUrl, parseUrl } from "./utils";
import { ParseResult } from "./types";
import { showFailureToast } from "@raycast/utils";

export function EditUrlForm({ url, onSave }: { url: ParseResult; onSave: (parsed: ParseResult) => void }) {
  const [fields, setFields] = useState<ParseResult | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const { push } = useNavigation();
  const [showAddQuery, setShowAddQuery] = useState(false);
  const [newQueryKey, setNewQueryKey] = useState("");
  const [newQueryValue, setNewQueryValue] = useState("");

  function updateFields(fields: ParseResult) {
    const href = buildUrl(fields);
    setFields({ ...fields, href });
  }

  useEffect(() => {
    if (url.href) {
      const parsed = parseUrl(url.href);
      if (parsed) {
        setFields({
          ...parsed,
          alias: url.alias,
        });
      }
    }
  }, [url.href, url.alias]);

  function handleFieldChange(id: string, value: string) {
    if (!fields) return;
    const newFields = { ...fields } as ParseResult;
    if (id.startsWith("query:")) {
      const key = id.replace("query:", "");
      newFields.query = { ...(newFields.query as Record<string, string>), [key]: value };
    } else if (id === "alias") {
      newFields.alias = value;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (newFields as any)[id] = value;
    }
    updateFields(newFields);
  }

  function handleAddQuery() {
    const clear = () => {
      setNewQueryKey("");
      setNewQueryValue("");
      setShowAddQuery(false);
    };
    if (!fields || !newQueryKey.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter query key and value" });
      clear();
      return;
    }
    const newFields = { ...fields } as ParseResult;
    newFields.query = { ...(newFields.query as Record<string, string>), [newQueryKey.trim()]: newQueryValue };
    updateFields(newFields);
    clear();
  }

  const fullUrl = fields ? buildUrl(fields) : "";

  async function handleGenerateQrAndShow() {
    try {
      const dataUrl = await QRCode.toDataURL(fullUrl);
      setQr(dataUrl);
      push(<QrDetail qr={dataUrl} url={fields} />);
    } catch (error) {
      console.error(error);
      showFailureToast(error, { title: "Failed to generate QR code" });
    }
  }

  function handleSubmit() {
    if (fields) {
      onSave(fields);
      showToast({ style: Toast.Style.Success, title: "Pinned to history" });
    }
  }

  if (!fields) {
    return (
      <Form>
        <Form.Description title="Invalid URL" text="Please check your input." />
      </Form>
    );
  }

  const descriptions = (
    <>
      <Form.Description
        title="Usage>>>"
        text={
          showAddQuery
            ? "💡Press Cmd + Shift + A Again to save the query!"
            : "💡Press Cmd + Shift + A to add query parameter" + "\n" + "💡Press Cmd + Shift + P to save/pin to history"
        }
      />
      <Form.Separator />
      <Form.Description title="Full URL" text={fullUrl} />
    </>
  );

  return (
    <Form
      navigationTitle="Edit URL"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={fullUrl} title="Copy to Clipboard" />
          <Action.Push
            title="Show Qr Code"
            icon={Icon.Code}
            target={<QrDetail qr={qr || ""} url={fields} />}
            onPush={handleGenerateQrAndShow}
          />
          {showAddQuery ? (
            <Action
              title="Add Query Parameter"
              icon={Icon.Plus}
              onAction={handleAddQuery}
              shortcut={{ modifiers: ["shift", "cmd"], key: "a" }}
            />
          ) : (
            <Action
              title="Add Query Parameter"
              icon={Icon.Plus}
              onAction={() => setShowAddQuery(true)}
              shortcut={{ modifiers: ["shift", "cmd"], key: "a" }}
            />
          )}
          <Action
            title="Save/pin to History"
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
      enableDrafts={false}
    >
      {descriptions}
      <Form.Separator />
      <Form.TextField
        id="alias"
        title="Alias in History (Optional)"
        value={fields.alias || ""}
        onChange={(v) => handleFieldChange("alias", v)}
        placeholder="Set a memorable alias for this URL"
      />
      <Form.Separator />
      <Form.TextField
        id="protocol"
        title="Protocol"
        value={fields.protocol || ""}
        onChange={(v) => handleFieldChange("protocol", v)}
      />
      <Form.TextField
        id="hostname"
        title="Host"
        value={fields.hostname || ""}
        onChange={(v) => handleFieldChange("hostname", v)}
      />

      <Form.TextField id="path" title="Path" value={fields.path || ""} onChange={(v) => handleFieldChange("path", v)} />
      {fields.hash ? (
        <Form.TextField
          id="hash"
          title="Hash"
          value={fields.hash || ""}
          onChange={(v) => handleFieldChange("hash", v)}
        />
      ) : null}
      {fields.port ? (
        <Form.TextField
          id="port"
          title="Port"
          value={fields.port || ""}
          onChange={(v) => handleFieldChange("port", v)}
        />
      ) : null}
      {/* Query Params */}
      {fields.query &&
        Object.entries(fields.query).map(([k, v]) => (
          <Form.TextField
            key={k}
            id={`query:${k}`}
            title={`Query: ${k}`}
            value={v as string}
            onChange={(val) => handleFieldChange(`query:${k}`, val)}
          />
        ))}
      {/* Add Query Form */}
      {showAddQuery && (
        <>
          <Form.TextField
            id="newQueryKey"
            title="New Query Key"
            value={newQueryKey}
            onChange={setNewQueryKey}
            placeholder="Enter query key"
          />
          <Form.TextField
            id="newQueryValue"
            title="New Query Value"
            value={newQueryValue}
            onChange={setNewQueryValue}
            placeholder="Enter query value"
          />
        </>
      )}
      <Form.Separator />
      {descriptions}
    </Form>
  );
}
