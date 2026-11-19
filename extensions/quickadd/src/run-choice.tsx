import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  type LaunchProps,
  List,
  Toast,
  open,
  popToRoot,
  showHUD,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  createDeeplink,
  showFailureToast,
  useCachedState,
  useFrecencySorting,
} from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  obsidianOpenUrl,
  prepareVault,
  runChoice,
  startInteractive,
} from "./lib/obsidianCli";
import { CurrentNotePicker } from "./completion-pickers";
import {
  type CurrentNote,
  asksForCurrentNote,
  currentFor,
} from "./lib/current-note";
import { choiceIcon } from "./lib/format";
import { quicklinkWithArgument } from "./lib/quicklink";
import { STALL_MS, InteractiveSessionView } from "./interactive-session";
import {
  type DoneResult,
  type InteractiveSession,
  doneMessage,
  firstEvent,
} from "./lib/interactive";
import type { ChoiceSummary } from "./lib/types";
import {
  type Readiness,
  type Registry,
  type Vault,
  chooseVault,
  readRegistry,
  sameNameConflict,
} from "./lib/vaults";

interface RunChoiceContext {
  vaultPath?: string;
  /** Set when launched from a pinned Quicklink: open this choice directly. */
  choiceId?: string;
  /** The Quicklink's argument, run as the choice's `{{VALUE}}`. */
  value?: string;
  relaunched?: boolean;
}

export default function RunChoiceCommand(
  props: LaunchProps<{ launchContext: RunChoiceContext }>,
) {
  const context = props.launchContext ?? {};
  const [registry] = useState(() => readRegistry());
  const chosen = chooseVault(
    context.vaultPath ?? getPreferenceValues<Preferences>().vaultPath,
    registry,
  );
  if (chosen.kind === "pick") {
    return <VaultPicker vaults={chosen.vaults} registry={registry} />;
  }
  return <VaultGate vault={chosen.vault} registry={registry} {...context} />;
}

function runChoiceDeeplink(context: RunChoiceContext): string {
  return createDeeplink({ command: "run-choice", context });
}

function VaultPicker({
  vaults,
  registry,
}: {
  vaults: Vault[];
  registry: Registry;
}) {
  return (
    <List searchBarPlaceholder="Search vaults...">
      {vaults.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No vault has QuickAdd enabled"
        />
      )}
      {vaults.map((vault) => (
        <List.Item
          key={vault.path}
          icon={Icon.Folder}
          title={vault.name}
          subtitle={vault.path}
          accessories={
            sameNameConflict(vault, registry)
              ? [
                  {
                    tag: {
                      value: "Same name as another vault",
                      color: Color.Orange,
                    },
                  },
                ]
              : []
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Choices"
                icon={Icon.List}
                target={<VaultGate vault={vault} registry={registry} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function VaultGate({
  vault,
  registry,
  choiceId,
  value,
  relaunched,
}: {
  vault: Vault;
  registry: Registry;
  choiceId?: string;
  value?: string;
  relaunched?: boolean;
}) {
  const [readiness, setReadiness] = useState<Readiness>();
  // Raycast double-invokes effects (StrictMode); the ref keeps it to one open.
  const readyRef = useRef<Promise<Readiness> | null>(null);

  useEffect(() => {
    let cancelled = false;
    readyRef.current ??= prepareVault(vault, choiceId, registry);
    void readyRef.current.then((result) => {
      if (cancelled) return;
      if (result.ok && result.opened && !relaunched) {
        // Obsidian took focus to open the vault. Reopening this command brings
        // Raycast back, and the new instance finds the vault ready.
        void open(
          runChoiceDeeplink({
            vaultPath: vault.path,
            choiceId,
            value,
            relaunched: true,
          }),
        );
        return;
      }
      setReadiness(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!readiness) return <List isLoading />;
  if (!readiness.ok) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={`Could not open ${vault.name}`}
          description={readiness.message}
        />
      </List>
    );
  }
  const choice =
    choiceId && readiness.choices.find(({ id }) => id === choiceId);
  return choice ? (
    <DirectChoice vault={vault} choice={choice} value={value} />
  ) : (
    <ChoiceList vault={vault} choices={readiness.choices} />
  );
}

function ChoiceList({
  vault,
  choices,
}: {
  vault: Vault;
  choices: ChoiceSummary[];
}) {
  const runnable = choices.filter((choice) => choice.runnable);
  // The hook sorts in place and cannot tell visited items from the rest, so it
  // gets a copy and the visited ids are kept beside it.
  const { data: byFrecency, visitItem } = useFrecencySorting([...runnable], {
    namespace: vault.path,
  });
  const [visited, setVisited] = useCachedState<string[]>(
    `visited-choices:${vault.path}`,
    [],
  );
  const visit = (choice: ChoiceSummary) => {
    void visitItem(choice);
    setVisited((ids) => (ids.includes(choice.id) ? ids : [...ids, choice.id]));
  };

  const recent = byFrecency
    .filter((choice) => visited.includes(choice.id))
    .slice(0, 5);
  const sections = groupByParent(runnable);

  return (
    <List searchBarPlaceholder="Search QuickAdd choices...">
      <List.Section title="Recent">
        {recent.map((choice) => (
          <ChoiceItem
            key={`recent-${choice.id}`}
            vault={vault}
            choice={choice}
            onRun={visit}
          />
        ))}
      </List.Section>
      {sections.map(([parent, choices]) => (
        <List.Section key={parent} title={parent}>
          {choices.map((choice) => (
            <ChoiceItem
              key={choice.id}
              vault={vault}
              choice={choice}
              onRun={visit}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

/**
 * Opens one choice directly (used when launched from a pinned Quicklink). The
 * session view shows the run from the start and closes the window with a HUD.
 */
function DirectChoice({
  vault,
  choice,
  value,
}: {
  vault: Vault;
  choice: ChoiceSummary;
  value?: string;
}) {
  const [current, setCurrent] = useState<CurrentNote>();
  const asking = asksForCurrentNote(choice) && current === undefined;
  const [view, setView] = useState<
    | { phase: "loading" }
    | { phase: "attach"; session: InteractiveSession }
    | { phase: "error"; message: string }
  >({ phase: "loading" });
  // Raycast double-invokes effects (StrictMode); without the ref the choice
  // runs twice.
  const startRef = useRef<ReturnType<typeof startInteractive> | null>(null);

  useEffect(() => {
    if (asking) return;
    let cancelled = false;
    startRef.current ??= startInteractive(vault, choice.id, {
      vars: value === undefined ? undefined : { value },
      current: currentFor(choice, current),
    });
    startRef.current.then(
      ({ session }) => {
        if (!cancelled) setView({ phase: "attach", session });
      },
      (error) => {
        if (cancelled) return;
        setView({
          phase: "error",
          message: error instanceof Error ? error.message : String(error),
        });
        void showFailureToast(error, { title: "Could not run choice" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [asking]);

  if (asking) {
    return (
      <CurrentNotePicker vault={vault} choice={choice} onPick={setCurrent} />
    );
  }
  if (view.phase === "attach") {
    return (
      <InteractiveSessionView
        vault={vault}
        session={view.session}
        choiceName={choice.name}
        onEnd={(end) =>
          void showHUD(
            end.state === "done"
              ? doneMessage(choice.name, end.result)
              : "Canceled",
          )
        }
      />
    );
  }
  if (view.phase === "error") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could not open choice"
          description={view.message}
        />
      </List>
    );
  }
  return <Form isLoading />;
}

/** Group runnable choices by their Multi folder path (root-level first). */
function groupByParent(
  choices: ChoiceSummary[],
): Array<[string, ChoiceSummary[]]> {
  const groups = new Map<string, ChoiceSummary[]>();
  for (const choice of choices) {
    const separatorIndex = choice.path.lastIndexOf(" / ");
    const parent =
      separatorIndex === -1 ? "Choices" : choice.path.slice(0, separatorIndex);
    const bucket = groups.get(parent) ?? [];
    bucket.push(choice);
    groups.set(parent, bucket);
  }
  return [...groups.entries()].sort(([a], [b]) =>
    a === "Choices" ? -1 : b === "Choices" ? 1 : a.localeCompare(b),
  );
}

function ChoiceItem({
  vault,
  choice,
  onRun,
}: {
  vault: Vault;
  choice: ChoiceSummary;
  onRun: (choice: ChoiceSummary) => void;
}) {
  const { push, pop } = useNavigation();

  async function runInteractive(current?: CurrentNote) {
    onRun(choice);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${choice.name}...`,
    });
    try {
      const { session } = await startInteractive(vault, choice.id, {
        current: currentFor(choice, current),
      });
      const first = await firstEvent(session, STALL_MS);
      if (first.kind === "error") throw new Error(first.error);
      await toast.hide();
      if (first.kind === "done") {
        await showToast(doneToast(vault, choice.name, first.result));
        return;
      }
      push(
        <InteractiveSessionView
          vault={vault}
          session={session}
          choiceName={choice.name}
          handoff={first}
          onEnd={(end) => {
            pop();
            void showToast(
              end.state === "done"
                ? doneToast(vault, choice.name, end.result)
                : { style: Toast.Style.Success, title: "Canceled" },
            );
          }}
        />,
      );
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: `Could not run ${choice.name}` });
    }
  }

  async function runInObsidian() {
    onRun(choice);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Running ${choice.name} in Obsidian...`,
      message: "Complete the prompts in Obsidian",
    });
    try {
      await open(obsidianOpenUrl(vault)); // bring Obsidian forward so prompts are visible
      const result = await runChoice(vault, choice.id, { ui: true });
      if (!result.ok) {
        throw new Error(result.error ?? "Choice execution failed");
      }
      await toast.hide();
      await showToast(doneToast(vault, choice.name, result));
      await popToRoot();
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, { title: `Could not run ${choice.name}` });
    }
  }

  const accessories: List.Item.Accessory[] = [];
  if (choice.command) {
    accessories.push({
      icon: Icon.Bolt,
      tooltip: "Marked as a command in QuickAdd - pin it as a Quicklink",
    });
  }
  accessories.push({ tag: choice.type });
  const deeplink = runChoiceDeeplink({
    vaultPath: vault.path,
    choiceId: choice.id,
  });

  return (
    <List.Item
      icon={choiceIcon(choice.type)}
      title={choice.name}
      accessories={accessories}
      keywords={choice.path.split(" / ")}
      actions={
        <ActionPanel>
          {asksForCurrentNote(choice) ? (
            <Action.Push
              title="Run"
              icon={Icon.Play}
              target={
                <CurrentNotePicker
                  vault={vault}
                  choice={choice}
                  onPick={(current) => {
                    pop();
                    void runInteractive(current);
                  }}
                />
              }
            />
          ) : (
            <Action
              title="Run"
              icon={Icon.Play}
              onAction={() => runInteractive()}
            />
          )}
          <Action
            title="Run in Obsidian"
            icon={Icon.AppWindow}
            onAction={runInObsidian}
          />
          <Action.CreateQuicklink
            title="Pin as Quicklink"
            icon={Icon.Pin}
            quicklink={{ name: choice.name, link: deeplink }}
          />
          <Action.CreateQuicklink
            title="Pin as Quicklink with Argument"
            icon={Icon.TextInput}
            quicklink={{
              name: choice.name,
              link: quicklinkWithArgument(
                createDeeplink({ command: "run-choice" }),
                { vaultPath: vault.path, choiceId: choice.id },
              ),
            }}
          />
          <Action.CopyToClipboard
            title="Copy Deeplink"
            icon={Icon.Link}
            content={deeplink}
          />
        </ActionPanel>
      }
    />
  );
}

function doneToast(
  vault: Vault,
  choiceName: string,
  result: DoneResult,
): Toast.Options {
  const { file } = result;
  return {
    style: Toast.Style.Success,
    title: doneMessage(choiceName, result),
    primaryAction: file
      ? {
          title: "Open in Obsidian",
          onAction: () => open(obsidianOpenUrl(vault, file)),
        }
      : undefined,
  };
}
