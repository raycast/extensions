import { Action, ActionPanel, Clipboard, Form, getSelectedFinderItems, Icon, useNavigation } from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
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

type FormValues = Record<string, string | boolean | string[]>;

/** A form built from the tool's option schema, so it always matches the installed Toolbox. */
/** `title` is only set when the form is pushed (from Search Toolbox Tools); a command's root view keeps Raycast's title. */
export function ToolForm({ tool, title }: { tool: Tool; title?: string }) {
  const { push } = useNavigation();
  const props = tool.inputSchema.properties;
  const takesFiles = "files" in props;
  const takesUrls = "urls" in props;

  const initialValues: FormValues = {};
  const validation: Record<string, (value: FormValues[string] | undefined) => string | undefined> = {};
  for (const [key, prop] of Object.entries(props)) {
    if (key === "files") {
      initialValues.files = [];
      validation.files = (v) => ((v as string[] | undefined)?.length ? undefined : "Choose at least one file");
    } else if (key === "urls") {
      initialValues.urls = "";
      validation.urls = (v) => (String(v ?? "").trim() ? undefined : "Paste at least one link");
    } else if (key === "output_folder") {
      initialValues.output_folder = [];
    } else if (prop.enum) {
      initialValues[key] = String(prop.default ?? prop.enum[0]);
    } else if (prop.type === "boolean") {
      initialValues[key] = prop.default === true;
    } else {
      initialValues[key] = prop.default !== undefined ? String(prop.default) : "";
      if (prop.type === "integer" || prop.type === "number") validation[key] = (v) => numberProblem(prop, v);
    }
  }

  const { handleSubmit, itemProps, setValue, values } = useForm<FormValues>({
    initialValues,
    validation,
    onSubmit: (raw) => push(<RunView tool={tool} values={toToolValues(props, raw)} />),
  });

  // Start with what's selected in Finder and, for links, a URL on the clipboard. Both are optional, so errors are ignored.
  usePromise(async () => (takesFiles ? (await getSelectedFinderItems()).map((i) => i.path) : []), [], {
    onData: (paths) => {
      if (paths.length && !(values.files as string[] | undefined)?.length) setValue("files", paths);
    },
    onError: () => undefined,
  });
  usePromise(async () => (takesUrls ? ((await Clipboard.readText()) ?? "").trim() : ""), [], {
    onData: (text) => {
      if (/^https?:\/\/\S+$/m.test(text) && !values.urls) setValue("urls", text);
    },
    onError: () => undefined,
  });

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
          <Action.SubmitForm title={`Run ${tool.title}`} icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={tool.description} />
      {takesFiles && (
        <Form.FilePicker
          {...(itemProps.files as Form.ItemProps<string[]>)}
          title="Files"
          info="Defaults to what's selected in Finder."
          allowMultipleSelection
          canChooseDirectories
        />
      )}
      {takesUrls && (
        <Form.TextArea
          {...(itemProps.urls as Form.ItemProps<string>)}
          title="Links"
          placeholder="One link per line"
          info="Only download videos you own or have permission to save."
        />
      )}
      {fields.map(([key, prop]) => (
        <Field key={key} id={key} prop={prop} item={itemProps[key]} />
      ))}
      {"output_folder" in props && (
        <Form.FilePicker
          {...(itemProps.output_folder as Form.ItemProps<string[]>)}
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

function numberProblem(prop: Property, value: FormValues[string] | undefined): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const n = Number(text);
  if (Number.isNaN(n) || (prop.type === "integer" && !Number.isInteger(n))) return "Enter a number";
  if (prop.minimum !== undefined && n < prop.minimum) return `At least ${prop.minimum}`;
  if (prop.maximum !== undefined && n > prop.maximum) return `At most ${prop.maximum}`;
  return undefined;
}

/** Form values → what `buildArgs` expects: link lists split, numbers parsed, one output folder. */
function toToolValues(props: Record<string, Property>, raw: FormValues): Values {
  const values: Values = {};
  for (const [key, prop] of Object.entries(props)) {
    const value = raw[key];
    if (key === "urls")
      values.urls = String(value ?? "")
        .split(/\s+/)
        .filter(Boolean);
    else if (key === "output_folder") values.output_folder = (value as string[] | undefined)?.[0];
    else if (prop.type === "integer" || prop.type === "number") {
      const text = String(value ?? "").trim();
      if (text) values[key] = Number(text);
    } else values[key] = value;
  }
  return values;
}

function Field({ id, prop, item }: { id: string; prop: Property; item: Form.ItemProps<FormValues[string]> }) {
  const title = humanize(id);
  if (prop.enum) {
    return (
      <Form.Dropdown {...(item as Form.ItemProps<string>)} title={title} info={prop.description}>
        {prop.enum.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={choiceTitle(id, value)} />
        ))}
      </Form.Dropdown>
    );
  }
  if (prop.type === "boolean") {
    return <Form.Checkbox {...(item as Form.ItemProps<boolean>)} label={title} info={prop.description} />;
  }
  if (/password/.test(id)) {
    return (
      <Form.PasswordField
        {...(item as Form.ItemProps<string>)}
        title={title}
        info={prop.description}
        placeholder={prop.description ?? title}
      />
    );
  }
  return (
    <Form.TextField
      {...(item as Form.ItemProps<string>)}
      title={title}
      info={prop.description}
      placeholder={prop.description ?? title}
    />
  );
}
