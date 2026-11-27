import { Action, ActionPanel, Form, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api";
import { ReactNode, useEffect, useRef, useState } from "react";
import { QrCodePreview } from "./qr-preview";
import { QueryParameterForm } from "./query-parameter-form";
import {
  addParameter,
  encodeNestedUrl,
  findNestedUrl,
  ParsedUrl,
  removeParameter,
  updateParameter,
  updateUrlComponent,
  UrlComponent,
} from "../lib/url";

const componentFields: { key: UrlComponent; title: string; placeholder: string }[] = [
  { key: "protocol", title: "Protocol", placeholder: "https: or myapp:" },
  { key: "hostname", title: "Hostname", placeholder: "example.com" },
  { key: "port", title: "Port", placeholder: "Default port" },
  { key: "pathname", title: "Path", placeholder: "/path/to/page" },
  { key: "hash", title: "Fragment / Hash", placeholder: "#section" },
];

export function UrlEditor({
  initialUrl,
  depth = 0,
  onChange,
  parameterName,
  getRootUrl,
}: {
  initialUrl: ParsedUrl;
  depth?: number;
  onChange?: (url: ParsedUrl) => void;
  parameterName?: string;
  getRootUrl?: () => string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const latestUrl = useRef(initialUrl);
  const [drafts, setDrafts] = useState<Partial<Record<UrlComponent, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<UrlComponent, string>>>({});
  const [selectedParameter, setSelectedParameter] = useState<string>();
  const formFields = useRef(new Map<string, Form.TextField>());
  const lastFocusedField = useRef("component-protocol");
  const pendingFocus = useRef<string | undefined>(undefined);
  const [focusRequest, setFocusRequest] = useState(0);
  const { push, pop } = useNavigation();
  const output = url.value.href;
  const error = Object.values(errors).find(Boolean);
  const selected =
    url.parameters.find(({ id }) => id === selectedParameter) ??
    (url.parameters.length === 1 ? url.parameters[0] : undefined);
  const nestedParameters = depth < 20 ? url.parameters.filter(({ value }) => findNestedUrl(value)) : [];
  const directNested =
    nestedParameters.find(({ id }) => id === selectedParameter) ??
    (nestedParameters.length === 1 ? nestedParameters[0] : undefined);
  const nestedActions = directNested
    ? [directNested, ...nestedParameters.filter(({ id }) => id !== directNested.id)]
    : nestedParameters;

  function completeUrl() {
    return getRootUrl ? getRootUrl() : latestUrl.current.value.href;
  }

  useEffect(() => {
    if (!focusRequest) return;
    const field = formFields.current.get(pendingFocus.current ?? lastFocusedField.current);
    (field ?? formFields.current.get("component-protocol"))?.focus();
    pendingFocus.current = undefined;
  }, [focusRequest]);

  function pushView(view: ReactNode) {
    // Restore focus after the editor has rendered again, including Escape and Back.
    push(view, () => setFocusRequest((request) => request + 1));
  }

  function replaceUrl(next: ParsedUrl) {
    latestUrl.current = next;
    setUrl(next);
    onChange?.(next);
  }

  function editComponent(component: UrlComponent, value: string) {
    setDrafts((current) => ({ ...current, [component]: value }));
    try {
      replaceUrl(updateUrlComponent(latestUrl.current, component, value));
      setErrors((current) => ({ ...current, [component]: undefined }));
    } catch (cause) {
      setErrors((current) => ({ ...current, [component]: (cause as Error).message }));
    }
  }

  function editValue(id: string, value: string) {
    const current = latestUrl.current;
    const parameter = current.parameters.find((item) => item.id === id);
    if (parameter) replaceUrl(updateParameter(current, id, parameter.key, value));
  }

  function add(key: string, value: string) {
    const next = addParameter(latestUrl.current, key, value);
    const id = next.parameters[next.parameters.length - 1].id;
    pendingFocus.current = `query-${id}`;
    setSelectedParameter(id);
    replaceUrl(next);
  }

  function remove(id: string) {
    replaceUrl(removeParameter(latestUrl.current, id));
    if (selectedParameter === id) setSelectedParameter(undefined);
  }

  function openNested(id: string) {
    if (error) {
      void showToast({ style: Toast.Style.Failure, title: "Fix Invalid Fields", message: error });
      return;
    }
    const parameter = latestUrl.current.parameters.find((item) => item.id === id);
    const nested = parameter && findNestedUrl(parameter.value);
    if (!parameter || !nested || depth >= 20) return;
    pushView(
      <UrlEditor
        initialUrl={nested.url}
        depth={depth + 1}
        parameterName={parameter.key}
        getRootUrl={completeUrl}
        onChange={(updated) => {
          const current = latestUrl.current;
          const parent = current.parameters.find((item) => item.id === id);
          if (parent) {
            const value = encodeNestedUrl(updated, nested.encodingLayers);
            replaceUrl(updateParameter(current, id, parent.key, value));
          }
        }}
      />,
    );
  }

  return (
    <Form
      navigationTitle={depth ? `${parameterName || "Nested URL"} · Level ${depth + 1}` : undefined}
      actions={
        <ActionPanel>
          {error ? (
            <Action
              title="Fix Invalid Fields"
              icon={Icon.Warning}
              onAction={() => showToast({ style: Toast.Style.Failure, title: "Unable to Copy URL", message: error })}
            />
          ) : (
            <Action.CopyToClipboard title="Copy URL" content={output} />
          )}
          {nestedActions.map((parameter) => (
            <Action
              key={parameter.id}
              title={
                nestedParameters.length === 1
                  ? "Open Nested URL"
                  : `Open ${parameter.key || "(empty key)"} (Parameter ${url.parameters.indexOf(parameter) + 1})`
              }
              icon={Icon.Link}
              shortcut={parameter.id === directNested?.id ? { modifiers: ["cmd"], key: "return" } : undefined}
              onAction={() => openNested(parameter.id)}
            />
          ))}
          {!error && (
            <>
              <Action
                title={depth ? "Generate QR Code for Current Level" : "Generate QR Code"}
                icon={Icon.Image}
                onAction={() =>
                  pushView(
                    <QrCodePreview
                      url={latestUrl.current.value.href}
                      allowEdit={false}
                      navigationTitle={depth ? `Level ${depth + 1} QR Code` : "URL QR Code"}
                    />,
                  )
                }
              />
              {depth > 0 && (
                <Action
                  title="Generate QR Code for Root Level"
                  icon={Icon.Image}
                  onAction={() =>
                    pushView(
                      <QrCodePreview url={completeUrl()} allowEdit={false} navigationTitle="Root Level QR Code" />,
                    )
                  }
                />
              )}
            </>
          )}
          <Action
            title="Add Query Parameter"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => pushView(<QueryParameterForm onSubmit={add} />)}
          />
          {selected && (
            <Action
              title={`Delete ${selected.key || "(empty key)"}`}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => remove(selected.id)}
            />
          )}
          {selected && (
            <Action
              title={`Rename ${selected.key || "(empty key)"}`}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                pushView(
                  <QueryParameterForm
                    parameter={selected}
                    onSubmit={(key) => {
                      const current = latestUrl.current;
                      const parameter = current.parameters.find((item) => item.id === selected.id);
                      if (parameter) replaceUrl(updateParameter(current, parameter.id, key, parameter.value));
                    }}
                  />,
                )
              }
            />
          )}
          {!selected && url.parameters.length > 1 && (
            <ActionPanel.Submenu title="Delete Query Parameter" icon={Icon.Trash}>
              {url.parameters.map((parameter, index) => (
                <Action
                  key={parameter.id}
                  title={`${index + 1}. ${parameter.key || "(empty key)"}`}
                  style={Action.Style.Destructive}
                  onAction={() => remove(parameter.id)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {!error && <Action.CopyToClipboard title="Copy Query" content={url.value.searchParams.toString()} />}
          <Action
            title="Reset This Level"
            icon={Icon.ArrowCounterClockwise}
            onAction={() => {
              replaceUrl(initialUrl);
              setDrafts({});
              setErrors({});
              setSelectedParameter(undefined);
            }}
          />
          {onChange && <Action title="Back to Parent URL" icon={Icon.ArrowLeft} onAction={pop} />}
        </ActionPanel>
      }
    >
      {componentFields.map((field) => (
        <Form.TextField
          key={field.key}
          id={`component-${field.key}`}
          title={field.title}
          placeholder={field.placeholder}
          value={drafts[field.key] ?? url.value[field.key]}
          onChange={(value) => editComponent(field.key, value)}
          onBlur={() => {
            if (!errors[field.key]) setDrafts((current) => ({ ...current, [field.key]: undefined }));
          }}
          onFocus={() => {
            lastFocusedField.current = `component-${field.key}`;
            setSelectedParameter(undefined);
          }}
          ref={(item) => {
            if (item) formFields.current.set(`component-${field.key}`, item);
            else formFields.current.delete(`component-${field.key}`);
          }}
          error={errors[field.key]}
        />
      ))}
      <Form.Separator />
      <Form.Description
        title="Query"
        text={`${url.parameters.length} parameters · ⌘N Add · ⌃X Delete Selected · ⌘K Actions`}
      />
      {url.parameters.map((parameter, index) => (
        <Form.TextField
          key={parameter.id}
          id={`query-${parameter.id}`}
          title={parameter.key || "(empty key)"}
          placeholder="Value"
          value={parameter.value}
          onChange={(value) => editValue(parameter.id, value)}
          onFocus={() => {
            lastFocusedField.current = `query-${parameter.id}`;
            setSelectedParameter(parameter.id);
          }}
          ref={(field) => {
            if (field) formFields.current.set(`query-${parameter.id}`, field);
            else formFields.current.delete(`query-${parameter.id}`);
          }}
          info={
            depth < 20 && findNestedUrl(parameter.value)
              ? `Parameter ${index + 1}: ⌘↵ Open URL · ⌃X Delete · ⌘E Rename`
              : `Parameter ${index + 1}: ⌃X Delete · ⌘E Rename. Changes update the URL immediately.`
          }
        />
      ))}
      {url.parameters.length === 0 && (
        <Form.Description text="No query parameters. Press ⌘N or choose Add Query Parameter from the ⌘K action menu." />
      )}
      <Form.Separator />
      <Form.Description title={depth ? "Current Level URL" : "Full URL"} text={output} />
      <Form.Description
        text={
          depth
            ? 'Choose "Generate QR Code for Current Level" or "Generate QR Code for Root Level" from the ⌘K action menu.'
            : 'Choose "Generate QR Code" from the ⌘K action menu to generate a QR code for this URL.'
        }
      />
    </Form>
  );
}
