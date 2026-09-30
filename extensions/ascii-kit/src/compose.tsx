import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Keyboard,
  List,
  getSelectedText,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { EXPECTS, FORMATS, KIND_TITLES, Kind, detectKinds, formatUnusable, unusable } from "./lib/formats";
import { fence, preview } from "./lib/markdown";

type Source = "selection" | "clipboard" | "typed";

type Input = { text: string; source: Source } | { error: string } | undefined;

async function readInput(): Promise<Input> {
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return { text: selected, source: "selection" };
  } catch {
    // No selection, or the frontmost app doesn't expose it: fall back to the clipboard.
  }
  try {
    const copied = await Clipboard.readText();
    if (copied?.trim()) return { text: copied, source: "clipboard" };
  } catch (e) {
    // Say so on the form, so a failed read doesn't look like an empty clipboard.
    return { error: e instanceof Error ? e.message : String(e) };
  }
  return undefined;
}

export default function Command() {
  const { data, isLoading } = usePromise(readInput);
  if (isLoading) return <List isLoading />;
  if (!data || "error" in data) return <TypeInput readError={data?.error} />;
  return <Compose input={data.text} source={data.source} />;
}

function Compose({ input, source }: { input: string; source: Source }) {
  const { push } = useNavigation();
  const kinds = useMemo(() => {
    const detected = detectKinds(input);
    const rank = (k: Kind) => (unusable(k, input) ? 100 : 0) + detected.indexOf(k);
    return (Object.keys(KIND_TITLES) as Kind[]).sort((a, b) => rank(a) - rank(b));
  }, [input]);
  const firstLine = input.trim().split("\n")[0];
  const excerpt = firstLine.length > 60 ? firstLine.slice(0, 60) + "…" : firstLine;
  const rendered = useMemo(() => new Map(FORMATS.map((f) => [f.id, f.render(input)])), [input]);

  return (
    <List isShowingDetail navigationTitle={`Compose · from ${source}`} searchBarPlaceholder="Filter formats…">
      {kinds.map((kind, i) => (
        <List.Section key={kind} title={i === 0 ? `Suggested · ${KIND_TITLES[kind]}` : KIND_TITLES[kind]}>
          {FORMATS.filter((f) => f.kind === kind).map((f) => {
            const reason = formatUnusable(f, input);
            const out = reason ? "" : (rendered.get(f.id) ?? "");
            return (
              <List.Item
                key={f.id}
                title={f.title}
                keywords={[kind]}
                detail={
                  <List.Item.Detail
                    markdown={
                      out.trim()
                        ? preview(out, `from ${source}`, f.caveat)
                        : [
                            `**Nothing to draw as ${KIND_TITLES[kind].toLowerCase()}.** ${reason ?? ""}`,
                            `${KIND_TITLES[kind]} expects ${EXPECTS[kind]}.`,
                            `_Read from ${source}: “${excerpt}”. Press ⌘E to edit the input._`,
                          ].join("\n\n")
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    {out.trim() ? (
                      <ActionPanel.Section>
                        <Action.Paste title="Paste" content={out} />
                        <Action.CopyToClipboard title="Copy" content={out} />
                        <Action.CopyToClipboard
                          title="Copy as Code Block"
                          content={fence(out)}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action.Paste
                          title="Paste as Code Block"
                          content={fence(out)}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                        />
                      </ActionPanel.Section>
                    ) : null}
                    <ActionPanel.Section>
                      <Action
                        title="Edit Input"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        onAction={() => push(<TypeInput initial={input} />)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function TypeInput({ initial = "", readError }: { initial?: string; readError?: string }) {
  const { push } = useNavigation();
  // Opened with text when editing (⌘E), empty when there was nothing to read.
  const editing = initial.trim() !== "";
  return (
    <Form
      navigationTitle={editing ? "Compose · edit input" : "Compose · type input"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Preview Formats"
            icon={Icon.Eye}
            onSubmit={(values: { input: string }) => {
              if (values.input.trim()) push(<Compose input={values.input} source="typed" />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          editing
            ? "Edit the input, then ⌘↵ to preview the formats again."
            : readError
              ? `Couldn't read the clipboard (${readError}). Type or paste what to draw, then ⌘↵.`
              : "Nothing selected or copied. Type or paste what to draw, then ⌘↵."
        }
      />
      <Form.TextArea id="input" title="Input" defaultValue={initial} enableMarkdown={false} autoFocus />
      {/* One row per kind: a single description collapses line breaks into one paragraph. */}
      {(Object.keys(EXPECTS) as Kind[]).map((k) => (
        <Form.Description key={k} title={KIND_TITLES[k]} text={EXPECTS[k].replace(/`/g, "")} />
      ))}
    </Form>
  );
}
