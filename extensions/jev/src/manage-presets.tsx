import { Action, ActionPanel, Alert, Form, Icon, List, confirmAlert, useNavigation, Keyboard } from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import { useState } from "react";
import { id, presetSchema, questionSchema, type Preset, type Question } from "./lib/model";
import { ErrorView, PreferencesAction, report, useData } from "./lib/ui";
function QuestionForm({ question, onSave }: { question?: Question; onSave: (q: Question) => Promise<void> }) {
  const { pop } = useNavigation();
  const [type, setType] = useState(question?.type ?? "noul");
  return (
    <Form
      navigationTitle="Edit Question"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Question"
            onSubmit={async (v: { title: string; instructions: string; options: string }) => {
              try {
                const options = (v.options ?? "")
                  .split("\n")
                  .filter((s) => s.trim())
                  .map((s) => {
                    const [name, ...description] = s.split("|");
                    return { label: name!.trim(), description: description.join("|").trim() };
                  });
                await onSave(
                  questionSchema.parse({
                    id: question?.id ?? id(),
                    title: v.title,
                    instructions: v.instructions,
                    type,
                    options: type === "noul" ? [] : options,
                  }),
                );
                pop();
              } catch (e) {
                await report(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Result Label" defaultValue={question?.title ?? ""} />
      <Form.Dropdown id="type" title="Question Type" value={type} onChange={(v) => setType(v as typeof type)}>
        <Form.Dropdown.Item value="noul" title="Yes / No Check" />
        <Form.Dropdown.Item value="choice" title="Category" />
        <Form.Dropdown.Item value="score" title="Score" />
      </Form.Dropdown>
      <Form.TextArea
        id="instructions"
        title="Question"
        defaultValue={question?.instructions ?? ""}
        placeholder="Ask one specific question about the supplied text."
      />
      {type !== "noul" && (
        <Form.TextArea
          id="options"
          title={type === "score" ? "Levels, Low to High" : "Categories"}
          defaultValue={question?.options.map((o) => `${o.label} | ${o.description}`).join("\n") ?? ""}
          placeholder="Label | Description\nAnother label | Description"
          info="One option per line. Separate its label and description with |. Add an Other category when needed."
        />
      )}
    </Form>
  );
}
function PresetEditor({ preset, onChange }: { preset: Preset; onChange: (p: Preset) => Promise<void> }) {
  const [p, setP] = useState(preset);
  const save = async (next: Preset) => {
    presetSchema.parse(next);
    await onChange(next);
    setP(next);
  };
  return (
    <List navigationTitle={p.name}>
      <List.Section title="Questions">
        {p.questions.map((q) => (
          <List.Item
            key={q.id}
            title={q.title}
            subtitle={q.instructions}
            accessories={[{ tag: q.type }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Edit Question"
                  target={
                    <QuestionForm
                      question={q}
                      onSave={async (next) =>
                        save({ ...p, questions: p.questions.map((x) => (x.id === q.id ? next : x)) })
                      }
                    />
                  }
                />
                <Action.Push
                  title="Add Question"
                  icon={Icon.Plus}
                  target={<QuestionForm onSave={async (q) => save({ ...p, questions: [...p.questions, q] })} />}
                />
                <Action
                  title="Remove Question"
                  icon={Icon.Trash}
                  onAction={async () => {
                    try {
                      await save({ ...p, questions: p.questions.filter((x) => x.id !== q.id) });
                    } catch (e) {
                      await report(e);
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
function PresetForm({ preset, onSave }: { preset?: Preset; onSave: (p: Preset) => Promise<void> }) {
  const { pop, push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            onSubmit={async (v: { name: string; description: string; favorite: boolean }) => {
              try {
                const p = presetSchema.parse({
                  ...v,
                  id: preset?.id ?? id(),
                  questions: preset?.questions ?? [
                    {
                      id: id(),
                      title: "Check",
                      type: "noul",
                      instructions: "Does the text explicitly state its main point?",
                      options: [],
                    },
                  ],
                });
                await onSave(p);
                pop();
                if (!preset) push(<PresetEditor preset={p} onChange={onSave} />);
              } catch (e) {
                await report(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={preset?.name ?? ""} />
      <Form.TextArea id="description" title="Description" defaultValue={preset?.description ?? ""} />
      <Form.Checkbox id="favorite" label="Show in favorites" defaultValue={preset?.favorite ?? true} />
      <Form.Description text="Save the preset, then add or edit its questions. Each question can classify, score, or check the text." />
    </Form>
  );
}
export default function Command() {
  const { data, loading, error, update } = useData();
  const { push } = useNavigation();
  if (error) return <ErrorView error={error} />;
  const save = async (p: Preset) => {
    await update((s) => {
      s.presets = s.presets.filter((x) => x.id !== p.id).concat(p);
    });
  };
  const create = (
    <Action.Push
      title="New Preset"
      icon={Icon.Plus}
      target={<PresetForm onSave={save} />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
  return (
    <List isLoading={loading} searchBarPlaceholder="Find presets…">
      <List.EmptyView
        title="Create a Preset"
        actions={
          <ActionPanel>
            {create}
            <Action.Push title="Import Preset" target={<ImportPreset onSave={save} />} />
            <PreferencesAction />
          </ActionPanel>
        }
      />
      {data.presets.map((p) => (
        <List.Item
          key={p.id}
          title={p.name}
          subtitle={p.description}
          icon={p.favorite ? Icon.Star : Icon.CheckList}
          accessories={[{ text: `${p.questions.length} check${p.questions.length === 1 ? "" : "s"}` }]}
          actions={
            <ActionPanel>
              <Action.Push title="Edit Questions" target={<PresetEditor preset={p} onChange={save} />} />
              <Action.Push title="Edit Preset" target={<PresetForm preset={p} onSave={save} />} />
              {create}
              <Action
                title="Duplicate Preset"
                icon={Icon.CopyClipboard}
                onAction={async () => {
                  try {
                    const next = { ...p, id: id(), name: `${p.name} Copy` };
                    await save(next);
                    push(<PresetEditor preset={next} onChange={save} />);
                  } catch (e) {
                    await report(e);
                  }
                }}
              />
              <Action.CreateQuicklink
                title="Create Preset Quicklink"
                quicklink={{
                  name: p.name,
                  link: createDeeplink({ command: "run-preset", context: { preset: p.id } }),
                }}
              />
              <Action.CopyToClipboard title="Export Preset as JSON" content={JSON.stringify(p, null, 2)} />
              <Action.Push title="Import Preset" target={<ImportPreset onSave={save} />} />
              <Action
                title="Delete Preset"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete ${p.name}?`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    })
                  ) {
                    try {
                      await update((d) => {
                        d.presets = d.presets.filter((x) => x.id !== p.id);
                      });
                    } catch (e) {
                      await report(e);
                    }
                  }
                }}
              />
              <PreferencesAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
function ImportPreset({ onSave }: { onSave: (p: Preset) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Preset"
            onSubmit={async (v: { json: string }) => {
              try {
                const p = presetSchema.parse(JSON.parse(v.json));
                await onSave({ ...p, id: id() });
                pop();
              } catch (e) {
                await report(e);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="json" title="Preset JSON" placeholder="Paste an exported Jev preset." />
    </Form>
  );
}
