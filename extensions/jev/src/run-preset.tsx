import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  LaunchProps,
  List,
  getSelectedText,
  getPreferenceValues,
  openExtensionPreferences,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { createDeeplink } from "@raycast/utils";
import { type Preset } from "./lib/model";
import { answerLabel, wireQuestion } from "./lib/questions";
import { ErrorView, PreferencesAction, askJev, markdown, report, useData } from "./lib/ui";
import { containsCredential } from "./lib/input";
import ManagePresets from "./manage-presets";
function RunForm({ preset, selection }: { preset: Preset; selection: string }) {
  const [text, setText] = useState(selection);
  const [busy, setBusy] = useState(false);
  const { push } = useNavigation();
  const hasKey = Boolean(getPreferenceValues<Preferences>().apiKey?.trim());
  return (
    <Form
      navigationTitle={preset.name}
      isLoading={busy}
      actions={
        <ActionPanel>
          {!hasKey && <Action title="Connect TypeSafe" onAction={openExtensionPreferences} />}
          <Action.SubmitForm
            title="Run with Jev"
            icon={Icon.Play}
            onSubmit={async () => {
              if (busy) return;
              if (!text.trim()) {
                await report(new Error("Select or enter text first."));
                return;
              }
              if (text.length > 24000) {
                await report(new Error("Use a selection of at most 24,000 characters."));
                return;
              }
              setBusy(true);
              try {
                const questions = Object.fromEntries(preset.questions.map((q) => [q.id, wireQuestion(q)]));
                const result = await askJev(text, questions);
                const lines = preset.questions.map((q) => `${q.title}: ${answerLabel(q, result.answers[q.id]!)}`);
                push(
                  <Detail
                    navigationTitle={preset.name}
                    markdown={`# ${markdown(preset.name)}\n\n${preset.questions.map((q) => `### ${markdown(q.title)}\n${markdown(answerLabel(q, result.answers[q.id]!))}`).join("\n\n")}\n\n---\nModel: ${markdown(result.model)}. These are model judgments about the supplied text.`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard title="Copy Results" content={lines.join("\n")} />
                        <Action.CopyToClipboard title="Copy JSON" content={JSON.stringify(result, null, 2)} />
                        <Action.Push
                          title="Inspect Probabilities"
                          target={<Detail markdown={`\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``} />}
                        />
                        <PreferencesAction />
                      </ActionPanel>
                    }
                  />,
                );
              } catch (e) {
                await report(e);
              } finally {
                setBusy(false);
              }
            }}
          />
          <Action
            title="Use Clipboard"
            icon={Icon.Clipboard}
            onAction={async () => {
              try {
                setText((await Clipboard.readText()) ?? "");
              } catch (e) {
                await report(e);
              }
            }}
          />
          <PreferencesAction />
        </ActionPanel>
      }
    >
      {!hasKey && (
        <Form.Description
          title="Connect TypeSafe First"
          text="Add your API key in Jev preferences to run this check. The text stays here while you set it up."
        />
      )}
      <Form.Description text={preset.description} />
      <Form.TextArea
        id="text"
        title="Text to Check"
        value={text}
        onChange={setText}
        placeholder="Selected text appears here. You can also paste text."
      />
      <Form.Description
        title="Sent When You Run"
        text="This text and the preset questions are sent to TypeSafe. Inputs and results are not saved in Jev history."
      />
    </Form>
  );
}
export default function Command(props: LaunchProps<{ launchContext: { preset?: string } }>) {
  const { data, loading, error } = useData();
  const [selection, setSelection] = useState<string>();
  useEffect(() => {
    getSelectedText()
      .then(async (selected) => {
        if (containsCredential(selected)) {
          setSelection("");
          await report(
            new Error(
              "Selected text appears to contain a credential and was not captured. Enter the text you want to check.",
            ),
          );
        } else setSelection(selected);
      })
      .catch(() => setSelection(""));
  }, []);
  if (error) return <ErrorView error={error} />;
  if (loading || selection === undefined) return <List isLoading searchBarPlaceholder="Preparing presets…" />;
  const presetId = props.launchContext?.preset;
  const selected = data.presets.find((p) => p.id === presetId);
  if (presetId && !loading && selection !== undefined) {
    if (!selected)
      return <ErrorView error="That preset no longer exists. Open Manage Presets to create a new shortcut." />;
    return <RunForm preset={selected} selection={selection} />;
  }
  return (
    <List
      isLoading={loading || selection === undefined}
      searchBarPlaceholder="Choose a saved check or category preset…"
    >
      <List.EmptyView
        title="No Presets"
        actions={
          <ActionPanel>
            <Action.Push title="Manage Presets" target={<ManagePresets />} />
          </ActionPanel>
        }
      />
      {[true, false].map((favorite) => (
        <List.Section key={String(favorite)} title={favorite ? "Favorites" : "More Presets"}>
          {data.presets
            .filter((p) => p.favorite === favorite)
            .map((p) => (
              <List.Item
                key={p.id}
                title={p.name}
                subtitle={p.description}
                icon={favorite ? Icon.Star : Icon.CheckList}
                accessories={[{ text: `${p.questions.length} check${p.questions.length === 1 ? "" : "s"}` }]}
                actions={
                  <ActionPanel>
                    <Action.Push title="Review Input" target={<RunForm preset={p} selection={selection ?? ""} />} />
                    <Action.CreateQuicklink
                      title="Create Preset Quicklink"
                      quicklink={{
                        name: p.name,
                        link: createDeeplink({ command: "run-preset", context: { preset: p.id } }),
                      }}
                    />
                    <Action.Push title="Manage Presets" target={<ManagePresets />} />
                    <PreferencesAction />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
