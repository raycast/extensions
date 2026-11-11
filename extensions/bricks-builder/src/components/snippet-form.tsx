import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  popToRoot,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import {
  detectKind,
  describeElements,
  parseBricksElements,
  Snippet,
  SNIPPET_KINDS,
  SnippetKind,
  upsertSnippet,
} from "../lib/snippets";

interface Values {
  name: string;
  kind: SnippetKind;
  content: string;
  tags: string;
}

interface SnippetFormProps {
  /** The snippet to edit. Without it, the form creates a new snippet. */
  snippet?: Snippet;
  /** Prefilled values for a new snippet. */
  defaults?: Partial<Pick<Snippet, "name" | "kind" | "content" | "tags">>;
  onSaved?: () => void;
  /** Close Raycast after saving instead of going back (for the standalone command). */
  closeOnSave?: boolean;
}

export function SnippetForm(props: SnippetFormProps) {
  const { pop } = useNavigation();
  const { snippet } = props;
  const source = snippet ?? props.defaults ?? {};
  const content = source.content ?? "";
  const elements = parseBricksElements(content);

  const { handleSubmit, itemProps, setValue } = useForm<Values>({
    initialValues: {
      name: source.name ?? (elements ? describeElements(elements) : ""),
      kind: source.kind ?? (content ? detectKind(content) : "css"),
      content,
      tags: source.tags?.join(", ") ?? "",
    },
    validation: {
      name: FormValidation.Required,
      content: (value) => {
        if (!value?.trim()) return "Required";
        if (itemProps.kind.value === "elements" && !parseBricksElements(value)) {
          return "Not Bricks elements. Copy elements in the builder with ⌘C first.";
        }
      },
    },
    async onSubmit(values) {
      await upsertSnippet({
        id: snippet?.id,
        name: values.name.trim(),
        kind: values.kind,
        content: values.content,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      props.onSaved?.();
      if (props.closeOnSave) {
        await showHUD(`Saved snippet ${values.name.trim()}`);
        await popToRoot();
      } else {
        await showToast({ style: Toast.Style.Success, title: `Saved ${values.name.trim()}` });
        pop();
      }
    },
  });

  return (
    <Form
      // The standalone command's form is a root screen, which keeps the command's own title.
      navigationTitle={props.closeOnSave ? undefined : snippet ? `Edit ${snippet.name}` : "New Snippet"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Snippet" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Hero section" {...itemProps.name} />
      <Form.Dropdown
        id="kind"
        title="Kind"
        value={itemProps.kind.value}
        error={itemProps.kind.error}
        onChange={(value) => itemProps.kind.onChange?.(value as SnippetKind)}
      >
        {SNIPPET_KINDS.map((kind) => (
          <Form.Dropdown.Item key={kind.value} value={kind.value} title={kind.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Content"
        placeholder="Paste CSS, JS, HTML, or Bricks elements copied with ⌘C in the builder"
        enableMarkdown={false}
        {...itemProps.content}
        onChange={(value) => {
          itemProps.content.onChange?.(value);
          if (!snippet && value && !itemProps.content.value) setValue("kind", detectKind(value));
        }}
      />
      <Form.TextField
        title="Tags"
        placeholder="hero, dark, footer"
        info="Comma-separated, used for search"
        {...itemProps.tags}
      />
    </Form>
  );
}

/** New-snippet form prefilled from the clipboard, e.g. elements copied in Bricks with ⌘C. */
export function SnippetFromClipboardForm(props: { onSaved?: () => void; closeOnSave?: boolean }) {
  const { data, isLoading } = usePromise(() => Clipboard.readText());
  if (isLoading) return <Form isLoading />;
  return <SnippetForm defaults={{ content: data ?? "" }} onSaved={props.onSaved} closeOnSave={props.closeOnSave} />;
}
