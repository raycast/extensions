import { Action, ActionPanel, Form, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { openMint, shortPath } from "./mint-cli";
import { MissingMint } from "./missing-mint";
import { NeedsNewerMint, RetryActions, runConfirmedInMint } from "./confirm-in-mint";
import { NATIVE_APPROVAL_CAPABILITY, handlingRows, handlingTitle, hasCapability, runParity } from "./mint-parity";
import type { HandlingAnswer, HandlingPermission, ParityRequest } from "./mint-parity";
import { useMintCLI } from "./use-mint-cli";

export default function Command() {
  const { resolution, recheck } = useMintCLI();
  if (resolution.status !== "ready") return <MissingMint resolution={resolution} onRetry={recheck} />;
  if (!hasCapability(resolution.version, NATIVE_APPROVAL_CAPABILITY)) return <NeedsNewerMint command="File Handling" />;
  return <Handling cli={resolution.path} />;
}

type Level = NonNullable<ParityRequest["level"]>;

/**
 * Where Mint never acts (Protect) and where it asks first (Needs Review), as in
 * Mint's settings. Protecting takes effect at once; anything that lets Mint do
 * more is confirmed in Mint's own window. A folder's protection reaches every
 * folder inside it.
 */
function Handling({ cli }: { cli: string }) {
  const { data, error, isLoading, revalidate } = usePromise(
    async (path: string) => runParity<HandlingAnswer>(path, { action: "handling.list" }, 60_000),
    [cli],
  );
  const rows = handlingRows(data);

  /** True once Mint saved it; false when Mint refused, failed or the person said no in Mint's window. */
  async function set(path: string, level: Level): Promise<boolean> {
    let saved = false;
    if (level === "protect") {
      // Protecting only narrows what Mint may do: no window, as in MCP.
      try {
        await runParity(cli, { action: "handling.set", path, level, confirmed: true });
        await showToast({ style: Toast.Style.Success, title: `Protected ${shortPath(path)}` });
        saved = true;
      } catch (setError) {
        await showFailureToast(setError, { title: "Mint could not save it" });
      }
    } else {
      const answer = await runConfirmedInMint(
        cli,
        { action: "handling.set", path, level },
        {
          done: () =>
            level === "ordinary" ? `Mint treats ${shortPath(path)} as usual` : `Mint asks first for ${shortPath(path)}`,
          failed: "Mint could not save it",
        },
      );
      saved = answer !== undefined;
    }
    revalidate();
    return saved;
  }

  const add = (
    <Action.Push
      title="Add a Location…"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<AddLocation onSet={set} />}
    />
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search protected locations">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Mint could not read its settings"
          description={error.message}
          actions={<RetryActions onRetry={revalidate} />}
        />
      ) : null}
      {!error && !isLoading && rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Lock}
          title="Nothing protected yet"
          description="Mint never touches a Protected location and asks before acting in a Needs Review one."
          actions={
            <ActionPanel>
              <Action.Push title="Add a Location…" icon={Icon.Plus} target={<AddLocation onSet={set} />} />
            </ActionPanel>
          }
        />
      ) : null}
      {(["protect", "needs_review"] as const).map((level) => (
        <List.Section key={level} title={handlingTitle(level)}>
          {rows
            .filter((row) => row.level === level)
            .map((row: HandlingPermission) => (
              <List.Item
                key={row.id}
                icon={{ fileIcon: row.path }}
                title={shortPath(row.path)}
                accessories={[{ tag: handlingTitle(row.level) }]}
                actions={
                  <ActionPanel>
                    {row.level === "protect" ? (
                      <Action
                        title="Ask First Instead…"
                        icon={Icon.QuestionMark}
                        onAction={() => set(row.path, "needs-review")}
                      />
                    ) : (
                      <Action title="Protect" icon={Icon.Lock} onAction={() => set(row.path, "protect")} />
                    )}
                    <Action.ShowInFinder path={row.path} />
                    <Action
                      title="Treat as Usual…"
                      icon={Icon.LockUnlocked}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => set(row.path, "ordinary")}
                    />
                    {add}
                    <Action title="Open Mint" icon={Icon.AppWindow} onAction={openMint} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function AddLocation({ onSet }: { onSet: (path: string, level: Level) => Promise<boolean> }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Add a Location"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={async (values: { paths: string[]; level: Level }) => {
              const path = values.paths?.[0];
              if (!path) {
                await showToast({ style: Toast.Style.Failure, title: "Choose a file or folder" });
                return;
              }
              // The form stays open with its choice until Mint has saved it.
              if (await onSet(path, values.level)) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="paths" title="Location" allowMultipleSelection={false} canChooseDirectories />
      <Form.Dropdown id="level" title="Mint" defaultValue="protect">
        <Form.Dropdown.Item value="protect" title="Never touches it (Protect)" />
        <Form.Dropdown.Item value="needs-review" title="Asks first (Needs Review)" />
      </Form.Dropdown>
    </Form>
  );
}
