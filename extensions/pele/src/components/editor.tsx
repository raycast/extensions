import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { EXAMPLES } from "../lib/examples";
import { normalizeSource } from "../lib/input";
import type { DiagramOptions } from "../lib/render";
import { THEMES } from "../lib/themes";

type Props = {
  source: string;
  options: DiagramOptions;
  error?: string;
  onRender: (source: string, options: DiagramOptions) => Promise<void>;
};

export function Editor({ source: initialSource, options: initialOptions, error: initialError, onRender }: Props) {
  const [source, setSource] = useState(initialSource);
  const [theme, setTheme] = useState(initialOptions.theme);
  const [scale, setScale] = useState(String(initialOptions.scale));
  const [transparent, setTransparent] = useState(initialOptions.transparent);
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);
  const pending = useRef(false);

  function updateSource(value: string) {
    setSource(value);
    setError(undefined);
  }

  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setIsLoading(true);
    setError(undefined);
    try {
      await onRender(normalizeSource(source), { theme, scale: Number(scale), transparent });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The diagram could not be rendered.";
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Could Not Render Diagram", message });
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      navigationTitle="Create Diagram"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Diagram" icon={Icon.Eye} onSubmit={submit} />
          <Action
            title="Use Clipboard"
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "v" },
              Windows: { modifiers: ["ctrl", "shift"], key: "v" },
            }}
            onAction={async () => {
              try {
                updateSource((await Clipboard.readText()) ?? "");
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Could Not Read Clipboard" });
              }
            }}
          />
          <ActionPanel.Submenu title="Load Example" icon={Icon.Document}>
            {EXAMPLES.map((example) => (
              <Action key={example.title} title={example.title} onAction={() => updateSource(example.source)} />
            ))}
          </ActionPanel.Submenu>
          <Action.OpenInBrowser title="Pele Documentation" url="https://pele.run/" />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="source"
        title="Mermaid Code"
        placeholder={EXAMPLES[0].source}
        value={source}
        onChange={updateSource}
        error={error}
        autoFocus
      />
      <Form.Description text="Paste Mermaid code with optional YAML frontmatter config or Markdown fences. Load an example from the Actions menu." />
      <Form.Dropdown id="theme" title="Theme" value={theme} onChange={setTheme}>
        {THEMES.map((theme) => (
          <Form.Dropdown.Item key={theme.id} value={theme.id} title={theme.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="scale" title="PNG Resolution" value={scale} onChange={setScale}>
        {[1, 2, 3, 4].map((scale) => (
          <Form.Dropdown.Item key={scale} value={String(scale)} title={`${scale}×`} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="transparent" label="Transparent Background" value={transparent} onChange={setTransparent} />
    </Form>
  );
}
