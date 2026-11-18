import { Action, ActionPanel, Color, Form, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { listFiles } from "../lib/api";
import { canIntrospect, introspect, pickEntrypoint, RUNNABLE_TYPES } from "../lib/schema";
import { cmdOrCtrl } from "../lib/shortcuts";
import { type ExtensionState } from "../lib/store";
import { addTool } from "../lib/tools";
import { emptyValConfig, readValConfig, writeValConfig, type ValConfig } from "../lib/valconfig";
import { Working, useBusy, type Busy } from "./Working";

const INSTRUCTIONS = "A JSON Schema describing the request body this val expects. Leave it empty if it takes none.";

const EXAMPLES_URL = "https://github.com/KevinBatdorf/val-town-raycast#argument-examples";

const BUSY = {
  reading: { icon: Icon.Download, title: "Loading configuration", failure: "Could not load the configuration" },
  generating: { icon: Icon.Stars, title: "Generating schema", failure: "Could not work out the arguments" },
  saving: { icon: Icon.Upload, title: "Saving configuration", failure: "Could not save" },
} satisfies Record<string, Busy>;

export function RegisterVal({
  identifier,
  register,
  member,
  preloaded,
  valDescription,
  onSaved,
}: {
  identifier: string;
  /**
   * True when the val is not in the collection yet. Nothing is added until the form is submitted:
   * escaping this screen has to leave the collection exactly as it was.
   */
  register: boolean;
  /** Whether the val is already in the allow list, so the checkbox can show the real state. */
  member: boolean;
  /** Read by the list on selection. Undefined means it has to be read here. */
  preloaded?: ValConfig | null;
  /** The val's own description, offered as the placeholder and used when this field is left empty. */
  valDescription?: string | null;
  onSaved: (state?: ExtensionState) => void;
}) {
  const { pop } = useNavigation();
  const known = preloaded !== undefined;
  const [config, setConfig] = useState<ValConfig>(preloaded ?? emptyValConfig());
  const [schema, setSchema] = useState(preloaded?.inputSchema ? JSON.stringify(preloaded.inputSchema, null, 2) : "");
  const [entrypoint, setEntrypoint] = useState(preloaded?.entrypoint ?? "");
  const [aiAccess, setAiAccess] = useState(register || (member && (preloaded?.active ?? false)));
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { busy, run } = useBusy(BUSY.reading);

  /**
   * The config may already exist from an earlier registration or another machine. The file list is
   * read alongside it only to prefill the entrypoint; the value is validated again on save.
   */
  useEffect(() => {
    setLoadFailed(false);
    void (async () => {
      const loaded = await run(BUSY.reading, async () => {
        // A failed config read must fail the screen: saving defaults over it would destroy the config.
        const [existing, listed] = await Promise.all([
          known ? Promise.resolve(preloaded) : readValConfig(identifier),
          listFiles(identifier)
            .then(({ files }) => files)
            .catch(() => []),
        ]);

        if (existing) {
          setConfig(existing);
          setSchema(existing.inputSchema ? JSON.stringify(existing.inputSchema, null, 2) : "");
          if (!register) setAiAccess(member && existing.active);
        }

        setEntrypoint(existing?.entrypoint ?? pickEntrypoint(listed)?.path ?? "");
      });

      if (!loaded) setLoadFailed(true);
    })();
  }, [attempt]);

  async function generate() {
    let takesNothing = false;

    const done = await run(BUSY.generating, async () => {
      // A typed entrypoint is used as-is; an empty field means the AI resolves the file and fills it in.
      const result = await introspect(identifier, entrypoint.trim() || undefined);
      if (!result) {
        takesNothing = true;
        setSchema("");
        return;
      }

      setEntrypoint(result.path);
      // No properties and no request body both mean the same thing, and the field says to leave it empty.
      takesNothing = !result.schema || Object.keys(result.schema.properties ?? {}).length === 0;
      setSchema(takesNothing ? "" : JSON.stringify(result.schema, null, 2));
    });

    // `run` hides its own toast before returning, so this one does not race it.
    if (done && takesNothing) {
      await showToast({ style: Toast.Style.Success, title: "This val takes no arguments" });
    }
  }

  async function submit(values: { schema: string; entrypoint: string; description: string; confirm: boolean }) {
    const wanted = values.entrypoint.trim();
    if (!wanted) {
      await showToast({ style: Toast.Style.Failure, title: "Name the file to call" });
      return;
    }

    const raw = values.schema.trim();
    let inputSchema = null;
    if (raw) {
      try {
        inputSchema = JSON.parse(raw);
      } catch {
        await showToast({ style: Toast.Style.Failure, title: "That is not valid JSON" });
        return;
      }
    }

    let next: ExtensionState | undefined;

    const saved = await run(BUSY.saving, async () => {
      // Checked against the val as it is now. If the file goes away later, the run reports it.
      const { files } = await listFiles(identifier);
      const target = files.find((file) => file.path === wanted);
      if (!target) throw new Error(`This val has no file at ${wanted}.`);
      if (!RUNNABLE_TYPES.includes(target.type)) {
        throw new Error(`${wanted} is a ${target.type} file, so it cannot be called.`);
      }

      await writeValConfig(identifier, {
        ...config,
        inputSchema,
        entrypoint: wanted,
        description: values.description.trim() || null,
        active: aiAccess,
        confirm: values.confirm,
      });

      // Membership is granted here and nowhere else, so a config always lands before the entry.
      if (aiAccess && !member) next = await addTool(identifier);
    });

    if (!saved) return;
    onSaved(next);
    pop();
  }

  if (busy) return <Working busy={busy} navigationTitle={identifier} />;

  // Rendering the form here would offer a save that destroys the config it could not read.
  if (loadFailed) {
    return (
      <List navigationTitle={identifier}>
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not load this val's configuration"
          description="Nothing was changed."
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setAttempt((n) => n + 1)} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      navigationTitle={identifier}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={submit} />
          {canIntrospect() ? (
            <Action title="Ask AI to Generate" icon={Icon.Stars} shortcut={cmdOrCtrl("g")} onAction={generate} />
          ) : null}
          <Action.OpenInBrowser
            title="Open Argument Examples"
            icon={Icon.Book}
            shortcut={Keyboard.Shortcut.Common.Open}
            url={EXAMPLES_URL}
          />
        </ActionPanel>
      }
    >
      <Form.Checkbox
        id="aiAccess"
        title="Raycast AI"
        label="Allow AI Access"
        value={aiAccess}
        onChange={setAiAccess}
        info="Whether Raycast AI can see and run this val. Running it yourself never needs this. Additional agent settings below."
      />
      <Form.Separator />
      <Form.TextField
        id="entrypoint"
        title="Entrypoint"
        value={entrypoint}
        onChange={setEntrypoint}
        placeholder="main.tsx"
        info="Which file to call. An http file is fetched at its endpoint; anything else runs with run_file and takes no arguments."
      />
      <Form.Separator />
      <Form.TextArea
        id="schema"
        title="Arguments"
        value={schema}
        onChange={setSchema}
        enableMarkdown={false}
        placeholder='{ "type": "object", "properties": {} }'
        info={INSTRUCTIONS}
      />
      {canIntrospect() ? <Form.Description text="⌘G asks Raycast AI to read the val's code and fill this in." /> : null}
      <Form.Description text="⌘O opens worked examples in the readme." />
      <Form.Separator />
      <Form.Description
        title="AI Agent Settings"
        text="How Raycast AI sees this val. Running it yourself needs none of it."
      />
      <Form.TextField
        id="description"
        title="Description"
        value={config.description ?? ""}
        onChange={(description) => setConfig((current) => ({ ...current, description }))}
        placeholder={valDescription ?? undefined}
        info="What the model reads when deciding whether to call this val. Leave empty to use the val's own description."
      />
      <Form.Checkbox
        id="confirm"
        label="Ask before running"
        value={config.confirm}
        onChange={(confirm) => setConfig((current) => ({ ...current, confirm }))}
        info="Off means Raycast AI runs this val without stopping to check."
      />
    </Form>
  );
}
