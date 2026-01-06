import {
  Form,
  ActionPanel,
  Action,
  Clipboard,
  useNavigation,
} from "@raycast/api";
import { Snippet } from "../types";
import { replacePlaceholders } from "../utils/placeholder";

interface Props {
  snippet: Snippet;
  placeholders: string[];
  onPaste?: () => void;
}

export default function FillerForm({ snippet, placeholders, onPaste }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = (values: Record<string, string>) => {
    const finalContent = replacePlaceholders(snippet.content, values);
    if (onPaste) onPaste();
    Clipboard.paste(finalContent);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Paste Snippet" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Preview"
        text={snippet.content.replace(/(\{?\{{1,2}.*?\}{1,2}\}?)/g, "**`$1`**")}
      />
      <Form.Separator />

      <Form.Description text={`Filling placeholders for: ${snippet.name}`} />
      {placeholders.map((placeholder) => (
        <Form.TextField
          key={placeholder}
          id={placeholder}
          title={placeholder}
          placeholder={`Enter value for ${placeholder}`}
        />
      ))}
    </Form>
  );
}
