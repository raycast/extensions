import { ComponentProps, useMemo, useRef } from "react";
import { Action, ActionPanel, Detail, Icon, Keyboard, List, Toast, showToast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  brewInstallCommand,
  brewInstallDryRun,
  brewIdentifier,
  brewName,
  brewUpgradeCommand,
  ensureError,
  getErrorMessage,
  isAbortError,
  uiLogger,
  isCask,
  parseDryRun,
  showBrewFailureToast,
  type Cask,
  type Formula,
  type Nameable,
  type OutdatedCask,
  type OutdatedFormula,
  type OutdatedResults,
} from "../utils";
import type { DryRunEntry, DryRunSection } from "../utils/brew/dry-run";
// Imported straight from the module, not the barrel: the barrel is owned elsewhere.
import { brewUpgradeDryRun } from "../utils/brew/actions";
import { formatBrewSize, parseUpgradeDryRun } from "../utils/brew/dry-run";
import { brewFindPackage } from "../utils/brew/search";
import { useTerminalApp } from "../utils/terminal";
import * as Actions from "./actions";
import { WARNING_ICON } from "./palette";
import { CaskInfo } from "./caskInfo";
import { FormulaInfo } from "./formulaInfo";

/** Plural for a section heading — `dry-run.ts` keeps its own copy for markdown. */
const PLURALS: Record<DryRunSection["noun"], string> = {
  formula: "formulae",
  cask: "casks",
  dependency: "dependencies",
  dependent: "dependents",
};

/**
 * What `PreviewList` renders. A parsed `brew install --dry-run` section is one
 * already; the two extras are for callers whose plan does not come from that
 * parser — the upgrade plan is one mixed list of formulae and casks, so its
 * heading cannot be derived from a noun, and its rows carry a download size.
 */
export type PreviewSection = Omit<DryRunSection, "entries"> & {
  /** Overrides the derived "Would upgrade N formulae" heading. */
  title?: string;
  entries: (DryRunEntry & { accessory?: string })[];
};

function sectionTitle(section: PreviewSection): string {
  if (section.title) {
    return section.title;
  }
  const noun = section.count === 1 ? section.noun : PLURALS[section.noun];
  return `Would ${section.verb} ${section.count} ${noun}${section.for ? ` for ${section.for}` : ""}`;
}

function sectionSubtitle(section: PreviewSection): string {
  const read = section.entries.length;
  // Homebrew's own N disagreeing with what we read means the parse is partial.
  const count = read === section.count ? `${read}` : `${read} of ${section.count} read — see Copy Raw Output`;
  return section.noun === "dependent" ? `${count} · already installed, upgraded by a shared dependency` : count;
}

function entrySubtitle(entry: DryRunEntry): string | undefined {
  if (entry.from && entry.to) {
    return `${entry.from} → ${entry.to}`;
  }
  return entry.to ? `→ ${entry.to}` : undefined;
}

/**
 * Open the Show Details view for a package the dry run named.
 *
 * The plan is names only, so the record has to be found. The lookup is deferred
 * to the keystroke rather than run for every row: a twelve-dependency plan would
 * otherwise pay twelve index lookups nobody asked for.
 */
function ShowDetailsAction(props: {
  name: string;
  isInstalled: (name: string) => boolean;
  onAction: (result: boolean) => void;
}) {
  const { push } = useNavigation();
  return (
    <Action
      title="Show Details"
      icon={Icon.Document}
      shortcut={Keyboard.Shortcut.Common.Open}
      onAction={async () => {
        // The toast goes up BEFORE the lookup: a silent pause reads as a stall.
        const toast = await showToast({ style: Toast.Style.Animated, title: `Looking up ${props.name}…` });
        try {
          const result = await brewFindPackage(props.name);
          await toast.hide();
          if (result.status === "unavailable") {
            // Two ways to get here, and neither is "no such package": the
            // cached index has not been downloaded yet (the lookup reads it and
            // deliberately will not build one), or the index named a record its
            // chunk did not hold. The first wants a search, the second wants
            // the cache rebuilt — so name both rather than assert the one.
            await showBrewFailureToast(
              "Details not available yet",
              new Error(
                `The Homebrew package index could not be read for ${props.name}. Run a search to download it, or clear the cache and search again.`,
              ),
            );
            return;
          }
          if (result.status === "missing") {
            // A tap-only formula is absent from the index. Say so rather than
            // pushing a details view built on nothing.
            await showBrewFailureToast(
              "No details available",
              new Error(`${props.name} is not in the Homebrew package index (it may come from a tap).`),
            );
            return;
          }
          const pkg = result.package;
          push(
            isCask(pkg) ? (
              <CaskInfo cask={pkg} isInstalled={props.isInstalled} onAction={props.onAction} />
            ) : (
              <FormulaInfo formula={pkg} isInstalled={props.isInstalled} onAction={props.onAction} />
            ),
          );
        } catch (err) {
          await toast.hide();
          await showBrewFailureToast("Lookup failed", ensureError(err));
        }
      }}
    />
  );
}

/** Every warning, verbatim, as one readable document. */
/** What Copy Warnings puts on the clipboard: brew's text, no heading of ours. */
function warningsPlain(warnings: string[]): string {
  return warnings.join("\n\n");
}

function warningsMarkdown(warnings: string[]): string {
  // The heading titles the pushed view — `navigationTitle` names only the
  // window chrome, which is why the body looked untitled — and it keeps
  // brew's prose off the top edge.
  return ["# Warnings", ...warnings].join("\n\n");
}

/**
 * Brew's warnings, off the list and into something readable.
 *
 * They are full sentences — often several, naming the packages they are about —
 * and as list rows they truncated mid-word with no way to read the rest.
 */
function WarningsAction(props: { warnings: string[] }) {
  const markdown = warningsMarkdown(props.warnings);
  return (
    <Action.Push
      title="Show Warnings"
      icon={WARNING_ICON}
      target={
        <Detail
          navigationTitle="Warnings"
          markdown={markdown}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Warnings"
                content={markdown}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      }
    />
  );
}

/**
 * A parsed `--dry-run` plan, as a browsable list.
 *
 * Presentation only — the caller owns the command, the wording and the primary
 * action, so an upgrade plan renders through this too. A List attaches actions
 * per row, so `actions` is called for every row: whatever the caller made
 * primary stays one keystroke away wherever the selection sits, and a caller
 * that wants the selected package's own action first gets the row's name.
 */
export function PreviewList(props: {
  navigationTitle: string;
  isLoading: boolean;
  /** Shown while loading, before there is a plan. */
  loadingTitle: string;
  /** The parsed plan. Undefined while loading. */
  sections?: PreviewSection[];
  /** brew's combined output, shown when the plan is empty — the only place the
   *  "already installed and up-to-date" line lives. */
  raw?: string;
  /** Wins over `sections`: a refresh that fails must not leave a stale plan up. */
  error?: { message: string; raw: string };
  /** Shown when there is nothing to do. */
  emptyTitle?: string;
  /** brew's warning lines, for plans that carry them (e.g. upgrade-everything). */
  warnings?: string[];
  /** A one-line summary for the whole plan, e.g. a total download size. */
  total?: string;
  /**
   * Built for every row, primary action first. `name` is the package on the
   * selected row, absent on the total, warnings and empty rows.
   *
   * Sections, as everywhere else in this extension: the operation and its
   * terminal variant first, then the copy actions. View and Refresh are
   * appended here, since Show Details belongs to this component.
   */
  actions: (name?: string, omitRawCopy?: boolean) => ComponentProps<typeof ActionPanel>["children"];
  /** Re-run the dry run. Rendered in the View section beside Show Details. */
  onRefresh: () => void;
  isInstalled?: (name: string) => boolean;
  onAction: (result: boolean) => void;
}) {
  // Defaults to "nothing is installed" because the panels that push this view
  // do not pass their installed map down; it only tags dependency chips in the
  // pushed detail view.
  const isInstalled = props.isInstalled ?? (() => false);
  const sections = props.sections ?? [];

  const warnings = props.warnings ?? [];

  function rowActions(
    name?: string,
    extra?: ComponentProps<typeof ActionPanel>["children"],
    /** The row's own `extra` already owns the common copy shortcut. */
    omitRawCopy?: boolean,
  ) {
    return (
      <ActionPanel>
        {extra}
        {props.actions(name, omitRawCopy)}
        <ActionPanel.Section title="View">
          {name !== undefined && <ShowDetailsAction name={name} isInstalled={isInstalled} onAction={props.onAction} />}
          <Action
            title="Refresh Preview"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={props.onRefresh}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  const empty = props.error ? (
    <List.EmptyView
      icon={Icon.Warning}
      title="Preview failed"
      // `List.EmptyView` collapses newlines, so a joined multi-part description
      // renders as one run-on line. Show brew's message here; the full output
      // stays reachable through Copy Raw Output.
      description={props.error.message}
      actions={rowActions()}
    />
  ) : props.isLoading ? (
    <List.EmptyView icon={Icon.Clock} title={props.loadingTitle} actions={rowActions()} />
  ) : (
    <List.EmptyView
      icon={Icon.Check}
      title={props.emptyTitle ?? "Nothing to install."}
      description={props.raw?.trimEnd()}
      actions={rowActions()}
    />
  );

  return (
    <List isLoading={props.isLoading} navigationTitle={props.navigationTitle} searchBarPlaceholder="Filter packages">
      {props.error || sections.length === 0 ? (
        empty
      ) : (
        <>
          {props.total && (
            <List.Section title="Total">
              <List.Item icon={Icon.Download} title={props.total} actions={rowActions()} />
            </List.Section>
          )}
          {warnings.length > 0 && (
            // One row, not one per warning: brew's warnings are several
            // sentences long and truncated mid-word as titles. The count is the
            // accessory and the text lives in the pushed Detail.
            <List.Section>
              <List.Item
                icon={WARNING_ICON}
                title="Warnings"
                accessories={[{ text: `${warnings.length}` }]}
                // On this row the common copy shortcut means Copy Warnings —
                // the warnings are what the row is about. The shared Copy Raw
                // Output claims the same binding, so it is dropped HERE ONLY;
                // every other row keeps it. Raw output is still one keystroke
                // away from any package row.
                actions={rowActions(
                  undefined,
                  [
                    <ActionPanel.Section key="warnings">
                      <WarningsAction warnings={warnings} />
                      <Action.CopyToClipboard
                        title="Copy Warnings"
                        content={warningsPlain(warnings)}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                    </ActionPanel.Section>,
                  ],
                  true,
                )}
              />
            </List.Section>
          )}
          {sections.map((section, index) => (
            <List.Section key={`section-${index}`} title={sectionTitle(section)} subtitle={sectionSubtitle(section)}>
              {section.entries.map((entry) => (
                <List.Item
                  key={`${index}-${entry.name}`}
                  icon={Icon.Box}
                  title={entry.name}
                  subtitle={entrySubtitle(entry)}
                  accessories={entry.accessory ? [{ text: entry.accessory }] : undefined}
                  actions={rowActions(entry.name)}
                />
              ))}
            </List.Section>
          ))}
        </>
      )}
    </List>
  );
}

/**
 * Run one of brew's `--dry-run` commands and hand back everything the two
 * preview views need from it.
 *
 * `usePromise` populates `abortable` with the controller for the in-flight call
 * and aborts it on unmount or revalidate — so backing out cancels the download.
 *
 * `raw` is BOTH streams, joined. The table is stdout, but the manifest noise
 * and the `Warning:` blocks are stderr (`download_queue.rb`, `$stderr.puts`);
 * parsing stdout alone silently drops every warning. Verified 2026-09-15
 * against a real run: 80 stdout lines, warnings entirely on stderr. `stdout` is
 * kept separate for the install parser, which reads only that stream.
 */
function useDryRunPreview<A>(
  run: (arg: A, signal?: AbortSignal) => Promise<{ stdout: string; stderr: string }>,
  arg: A,
  /** Shown in an animated toast while the dry run is in flight. */
  progressTitle: string,
) {
  const abortable = useRef<AbortController>(null);
  // Which run owns the progress toast. `usePromise` supersedes a run by
  // aborting it, swapping the controller and calling the next one WITHOUT
  // waiting for the old one to settle (@raycast/utils) — so run N's abort lands
  // after run N+1 has already put its own toast up. Raycast's hide carries no
  // toast id and acts on whatever is visible, so an unguarded hide there
  // dismisses N+1's toast and leaves the live run with no progress at all.
  const toastRun = useRef(0);

  const { data, error, isLoading, revalidate } = usePromise(
    async (value: A) => {
      // The navigation loader alone is a thin signal for a dry run that waits
      // on bottle manifests over the network, so the wait gets a named toast.
      //
      // It lives HERE rather than in an effect on `isLoading` deliberately.
      // Raycast's hide carries no toast id — it acts on whichever toast is on
      // screen (see `src/utils/toast.ts`) — so every hide below is guarded
      // twice: by WHEN it fires (never after a real failure, whose own toast
      // must keep the slot) and by WHETHER this run still owns the toast.
      const mine = ++toastRun.current;
      // Best-effort, never awaited into the result: a hide that rejects must not
      // turn a finished dry run into a "Preview failed" (`settle` in
      // `src/utils/toast.ts` takes the same line).
      const clearProgress = (toast: Toast) => {
        if (toastRun.current !== mine) return; // superseded — the toast is not ours any more
        toast.hide().catch((hideErr) => uiLogger.log("Failed to hide preview progress toast", hideErr));
      };

      const progress = await showToast({ style: Toast.Style.Animated, title: progressTitle });
      try {
        const { stdout, stderr } = await run(value, abortable.current?.signal);
        clearProgress(progress);
        return { stdout, raw: [stdout, stderr].filter(Boolean).join("\n") };
      } catch (err) {
        // Backing out of this view aborts the run, and an abort raises no toast
        // of its own — `showBrewFailureToast` returns early on one and
        // `usePromise` suppresses `onError` for it — so this toast has to clear
        // itself or spin on after the user has gone. A real failure is the
        // opposite case: `onError` puts a failure toast up, and hiding here
        // would dismiss THAT one.
        if (isAbortError(err)) clearProgress(progress);
        throw err;
      }
    },
    [arg],
    {
      abortable,
      onError: async (err) => {
        await showBrewFailureToast("Preview failed", err);
      },
    },
  );

  // The caught error carries brew's output; there is no bare stdout here.
  const execError = error as (Error & { stdout?: string; stderr?: string }) | undefined;

  return {
    data,
    isLoading,
    revalidate,
    error: error
      ? { message: getErrorMessage(error), raw: [execError?.stderr, execError?.stdout].filter(Boolean).join("\n") }
      : undefined,
  };
}

/**
 * Hand the command to a terminal instead of running it inside Raycast.
 *
 * Owns `useTerminalApp()` so neither preview has to call it.
 */
function RunInTerminalAction(props: { verb: string; command: string }) {
  const { terminalName, terminalIcon, runCommandInTerminal } = useTerminalApp();
  return (
    <Action
      title={`Run ${props.verb} in ${terminalName}`}
      icon={terminalIcon}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={() => runCommandInTerminal(props.command)}
    />
  );
}

/** The command always, and brew's own output once the run has produced some. */
function PreviewCopyActions(props: {
  verb: string;
  command: string;
  raw: string;
  isLoading: boolean;
  /** Set on a row that already binds the common copy shortcut to its own text. */
  omitRawCopy?: boolean;
}) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title={`Copy ${props.verb} Command`}
        content={props.command}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
      />
      {!props.isLoading && !props.omitRawCopy && (
        <Action.CopyToClipboard title="Copy Raw Output" content={props.raw} shortcut={Keyboard.Shortcut.Common.Copy} />
      )}
    </ActionPanel.Section>
  );
}

/**
 * What `brew install` would actually do, before you commit to it.
 *
 * The dry run mutates nothing, so there is no confirmation here — the hand-off
 * is the existing Install action, which owns its own progress toast.
 */
export function InstallPreview(props: {
  item: Cask | Formula;
  onAction: (result: boolean) => void;
  isInstalled?: (name: string) => boolean;
}) {
  const { pop } = useNavigation();
  const { item } = props;
  const name = brewName(item);
  const command = brewInstallCommand(item);

  const { data, error, isLoading, revalidate } = useDryRunPreview(
    brewInstallDryRun,
    item,
    `Previewing install of ${brewName(item)}…`,
  );
  const sections = data && parseDryRun(data.stdout);
  // Nothing that actually installs is reachable until the preview has settled
  // AND succeeded: a failed dry run is not a plan, so there is nothing here the
  // user could have reviewed before committing to it.
  const ready = !isLoading && !error;

  return (
    <PreviewList
      navigationTitle={`Preview Install: ${name}`}
      isLoading={isLoading}
      loadingTitle="Asking Homebrew what it would install…"
      sections={sections}
      raw={data?.raw}
      error={error}
      isInstalled={props.isInstalled}
      onAction={props.onAction}
      onRefresh={revalidate}
      actions={() => (
        <>
          <ActionPanel.Section>
            {ready && (
              // Named, because the cursor is on a dependency row more often
              // than not and this installs the previewed package regardless.
              <Actions.FormulaInstallAction
                formula={item}
                title={`Install ${name}`}
                onAction={(result) => {
                  pop();
                  props.onAction(result);
                }}
              />
            )}
            {ready && <RunInTerminalAction verb="Install" command={command} />}
          </ActionPanel.Section>
          <PreviewCopyActions
            verb="Install"
            command={command}
            isLoading={isLoading}
            raw={error ? error.raw : (data?.raw ?? "")}
          />
        </>
      )}
    />
  );
}

/**
 * What `brew upgrade` would actually do to the whole machine, before you run it.
 *
 * On demand only, and deliberately not wired to anything that mounts on view
 * load: `brew upgrade --dry-run` resolves a bottle manifest over the network
 * for every outdated package, which takes tens of seconds on a full list (79
 * packages here). Pushing this view IS the request, and the loading row
 * `PreviewList` renders is on screen from the first frame — before the call
 * starts — so the wait never reads as a stall.
 */
export function UpgradePreview(props: {
  /**
   * Preview one package's upgrade instead of the whole machine's. The same
   * view either way — only the title, the heading and the commands narrow.
   *
   * `Nameable`, not `Cask | Formula`: Show Upgrades holds `OutdatedCask` /
   * `OutdatedFormula` rows, and everything downstream of here — `brewName`,
   * `brewUpgradeCommand`, `brewUpgradeDryRun` — already takes that shape.
   */
  target?: Cask | Nameable;
  /**
   * The outdated packages behind a whole-machine preview, as two typed lists.
   *
   * brew's upgrade table is names only — it does not mark which rows are casks
   * — so this is where a row's kind comes from. Unused when `target` is set:
   * that is already a full package object.
   */
  outdated?: OutdatedResults;
  onAction: (result: boolean) => void;
}) {
  const { target, outdated } = props;
  const targetName = target ? brewName(target) : undefined;
  const command = target ? brewUpgradeCommand(target) : "brew upgrade";

  const { data, error, isLoading, revalidate } = useDryRunPreview(
    brewUpgradeDryRun,
    target,
    targetName ? `Previewing upgrade of ${targetName}…` : "Previewing upgrades…",
  );
  const plan = data && parseUpgradeDryRun(data.raw);
  // Nothing that actually upgrades is reachable until the preview has settled
  // AND succeeded — an upgrade started over the loading row would run before
  // the plan it is meant to preview had appeared.
  const ready = !isLoading && !error;

  // Row name → the outdated record it came from, keyed the way brew's table
  // names it: the token for a cask, the name for a formula. `null` marks a name
  // claimed by both a formula and a cask — the table cannot say which row is
  // which, so neither can we.
  const rows = useMemo(() => {
    const map = new Map<string, OutdatedCask | OutdatedFormula | null>();
    const add = (key: string, pkg: OutdatedCask | OutdatedFormula) => map.set(key, map.has(key) ? null : pkg);
    for (const formula of outdated?.formulae ?? []) add(formula.name, formula);
    for (const cask of outdated?.casks ?? []) add(cask.token || cask.name, cask);
    return map;
  }, [outdated]);

  /**
   * The package a row's upgrade action should target, or undefined for no
   * action at all.
   *
   * A bare `{ name }` is never the answer: `isCask` keys off `token`, so a cask
   * row without one builds a formula-shaped command and upgrades a same-named
   * formula — or fails — while the user is looking at the cask. A row we cannot
   * place (a dependency brew pulled in that was not itself outdated, or an
   * ambiguous name) gets no upgrade action; Show Details still resolves it
   * through the package index.
   */
  function rowTarget(name?: string): Cask | Nameable | undefined {
    // The total and warnings rows name nothing — fall back to the previewed
    // package, whose kind is known.
    if (name === undefined) return target;
    if (target) return brewIdentifier(target) === name ? target : undefined;
    return rows.get(name) ?? undefined;
  }

  // One section: brew's own plan is a single mixed table of formulae and casks,
  // and splitting it would invent a grouping brew did not report.
  const sections: PreviewSection[] | undefined = plan?.entries.length
    ? [
        {
          verb: "upgrade",
          noun: "formula",
          title: targetName ? `Would upgrade ${targetName}` : "Would upgrade",
          count: plan.entries.length,
          entries: plan.entries.map((entry) => ({
            name: entry.name,
            from: entry.from,
            to: entry.to,
            accessory: entry.bytes === undefined ? undefined : formatBrewSize(entry.bytes),
          })),
        },
      ]
    : undefined;

  return (
    <PreviewList
      navigationTitle={targetName ? `Preview Upgrade: ${targetName}` : "Preview Upgrades"}
      isLoading={isLoading}
      loadingTitle={
        targetName
          ? `Asking Homebrew what it would upgrade for ${targetName}…`
          : "Asking Homebrew what it would upgrade…"
      }
      sections={sections}
      raw={data?.raw}
      emptyTitle="Nothing to upgrade."
      warnings={plan?.warnings}
      // Casks and unbottled formulae carry no size, so this is the total of the
      // rows that had one — not of the whole run.
      total={plan && plan.totalBytes > 0 ? `${formatBrewSize(plan.totalBytes)} to download` : undefined}
      error={error}
      onAction={props.onAction}
      onRefresh={revalidate}
      actions={(name, omitRawCopy) => {
        // The selected row's own package, so ⏎ upgrades what the cursor is on —
        // with its real kind, not a bare name. See `rowTarget`.
        const upgradeTarget = ready ? rowTarget(name) : undefined;
        // A row that names a package we cannot place offers no upgrade at all —
        // not even Upgrade All or the terminal hand-off. They would inherit ⏎
        // from the missing per-row action and upgrade the whole machine from a
        // row showing one package: the same wrong-target trap, one slot over.
        const canUpgrade = ready && (upgradeTarget !== undefined || name === undefined);
        return (
          <>
            <ActionPanel.Section>
              {upgradeTarget && <Actions.FormulaUpgradeAction formula={upgradeTarget} onAction={props.onAction} />}
              {/* Whole-machine only. A preview of ONE package must not offer to
                  upgrade everything — the view names a single package, and the
                  action would act on every outdated one. */}
              {canUpgrade && !target && <Actions.FormulaUpgradeAllAction onAction={props.onAction} />}
              {canUpgrade && <RunInTerminalAction verb="Upgrade" command={command} />}
            </ActionPanel.Section>
            <PreviewCopyActions
              verb="Upgrade"
              command={command}
              isLoading={isLoading}
              omitRawCopy={omitRawCopy}
              raw={error ? error.raw : (data?.raw ?? "")}
            />
          </>
        );
      }}
    />
  );
}
