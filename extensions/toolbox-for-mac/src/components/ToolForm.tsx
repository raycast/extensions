import { Action, ActionPanel, Clipboard, Form, getSelectedFinderItems, Icon, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { Property, Tool, Values } from "../lib/toolbox";
import { RunView } from "./RunView";

const humanize = (key: string) => {
  const text = key
    .replace(/_/g, " ")
    .replace(/\bh264\b/i, "H.264")
    .replace(/\bhevc\b/i, "HEVC");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Option values like "audio_mp3" or "1080" read better as "Audio MP3" and "1080p". */
function choiceTitle(key: string, value: string) {
  if (/^\d{3,4}$/.test(value) && /resolution|quality|height/.test(key)) return `${value}p`;
  return humanize(value)
    .replace(/\b(mp3|mp4|m4a|wav|pdf|png|jpe?g|heic|webp|gif|tiff|hevc|h264|aac|flac|docx)\b/gi, (m) => m.toUpperCase())
    .replace(/\bH264\b/, "H.264");
}

/** A form built from the tool's option schema, so it always matches the installed Toolbox. */
/** `title` is only set when the form is pushed (from Search Toolbox Tools); a command's root view keeps Raycast's title. */
export function ToolForm({ tool, title }: { tool: Tool; title?: string }) {
  const { push } = useNavigation();
  const props = tool.inputSchema.properties;
  const takesFiles = "files" in props;
  const takesUrls = "urls" in props;
  const [files, setFiles] = useState<string[]>([]);
  const [urls, setUrls] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  // Start with what's selected in Finder and, for links, a URL on the clipboard. Both are optional, so errors are ignored.
  usePromise(async () => (takesFiles ? (await getSelectedFinderItems()).map((i) => i.path) : []), [], {
    onData: (paths) => setFiles((current) => (current.length ? current : paths)),
    onError: () => undefined,
  });
  usePromise(async () => (takesUrls ? ((await Clipboard.readText()) ?? "").trim() : ""), [], {
    onData: (text) => {
      if (/^https?:\/\/\S+$/m.test(text)) setUrls((current) => current || text);
    },
    onError: () => undefined,
  });

  function submit(raw: Form.Values) {
    const values: Values = {};
    const problems: Record<string, string> = {};
    for (const [key, prop] of Object.entries(props)) {
      const value = raw[key];
      if (key === "files") values.files = files;
      else if (key === "urls") values.urls = urls.split(/\s+/).filter(Boolean);
      else if (key === "output_folder") values.output_folder = (value as string[] | undefined)?.[0];
      else if (prop.type === "integer" || prop.type === "number") {
        if (value === "" || value === undefined) continue;
        const n = Number(value);
        if (Number.isNaN(n) || (prop.type === "integer" && !Number.isInteger(n))) problems[key] = "Enter a number";
        else if (prop.minimum !== undefined && n < prop.minimum) problems[key] = `At least ${prop.minimum}`;
        else if (prop.maximum !== undefined && n > prop.maximum) problems[key] = `At most ${prop.maximum}`;
        else values[key] = n;
      } else values[key] = value as string | boolean;
    }
    if (takesFiles && files.length === 0) problems.files = "Choose at least one file";
    if (takesUrls && (values.urls as string[]).length === 0) problems.urls = "Paste at least one link";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    push(<RunView tool={tool} values={values} />);
  }

  // Main choices first (quality, format, mode), then other choices, then numbers and text, then on/off switches.
  const rank = ([key, prop]: [string, Property]) =>
    /^(quality|format|mode|to)$/.test(key) ? 0 : prop.enum ? 1 : prop.type === "boolean" ? 3 : 2;
  const fields = Object.entries(props)
    .filter(([key]) => !["files", "urls", "output_folder"].includes(key))
    .sort((a, b) => rank(a) - rank(b));

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Run ${tool.title}`} icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text={tool.description} />
      {takesFiles && (
        <Form.FilePicker
          id="files"
          title="Files"
          info="Defaults to what's selected in Finder."
          allowMultipleSelection
          canChooseDirectories
          value={files}
          onChange={(value) => {
            setFiles(value);
            clearError("files");
          }}
          error={errors.files}
        />
      )}
      {takesUrls && (
        <Form.TextArea
          id="urls"
          title="Links"
          placeholder="One link per line"
          value={urls}
          onChange={(value) => {
            setUrls(value);
            clearError("urls");
          }}
          error={errors.urls}
          info="Only download videos you own or have permission to save."
        />
      )}
      {fields.map(([key, prop]) => (
        <Field key={key} id={key} prop={prop} error={errors[key]} onEdit={() => clearError(key)} />
      ))}
      {"output_folder" in props && (
        <Form.FilePicker
          id="output_folder"
          title="Save To"
          info="Leave empty to use Toolbox's results folder (Downloads by default)."
          canChooseDirectories
          canChooseFiles={false}
          allowMultipleSelection={false}
        />
      )}
    </Form>
  );
}

function Field({ id, prop, error, onEdit }: { id: string; prop: Property; error?: string; onEdit: () => void }) {
  const title = humanize(id);
  if (prop.enum) {
    return (
      <Form.Dropdown id={id} title={title} info={prop.description} defaultValue={String(prop.default ?? prop.enum[0])}>
        {prop.enum.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={choiceTitle(id, value)} />
        ))}
      </Form.Dropdown>
    );
  }
  if (prop.type === "boolean") {
    return <Form.Checkbox id={id} label={title} info={prop.description} defaultValue={prop.default === true} />;
  }
  if (/password/.test(id)) {
    return (
      <Form.PasswordField
        id={id}
        title={title}
        info={prop.description}
        placeholder={prop.description ?? title}
        error={error}
        onChange={onEdit}
      />
    );
  }
  return (
    <Form.TextField
      id={id}
      title={title}
      info={prop.description}
      placeholder={prop.description}
      defaultValue={prop.default !== undefined ? String(prop.default) : undefined}
      error={error}
      onChange={onEdit}
    />
  );
}
