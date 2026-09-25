/**
 * Adopt Apps — applications already on the Mac that Homebrew could take over.
 *
 * `brew install --adopt --cask <token>` claims an app at the cask's destination
 * instead of downloading over it. Finding candidates is the hard part and the
 * reason this command exists rather than a bare token field: matching on the
 * app's bundle name alone regularly pairs an app with unrelated software that
 * happens to share its name, and a wrong adoption is not cosmetic — Homebrew writes a
 * receipt, after which `brew upgrade` replaces the app and `brew uninstall`
 * deletes it.
 *
 * So the list is sectioned by *who vouches for the match*, never by a single
 * confidence score — see `AdoptTier` in `utils/brew/adopt.ts`. Adoption from
 * the Likely section goes through the preview first, because there the only
 * review the match gets is the user's.
 *
 * Not gated on Homebrew 7: `--adopt` landed in `cmd/install.rb` on 2023-04-19
 * (`b2156dc125`), well below anything this extension supports.
 */

import { useRef, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AdoptPreview } from "./components/adoptPreview";
import { RefreshAction } from "./components/actionPanels";
import { IN_PROGRESS_ICON, STATUS_COLOR, UNINSTALLABLE_ICON, WARNING_ICON } from "./components/palette";
import { useAdoptCandidates } from "./hooks/useAdoptCandidates";
import { randomUUID } from "crypto";
import { existsSync, rmSync } from "fs";
import os from "os";
import path from "path";
import { actionsLogger, uiLogger } from "./utils/logger";
import { ignoreBundleId, resetIgnoredApps, stopIgnoringBundleId } from "./utils/adoptIgnore";
import {
  adoptProgressText,
  isAdoptPhase,
  brewAdoptCaskArgs,
  brewAdoptCaskCommand,
  execBrewWithProgress,
  confirmAndRun,
  ensureError,
  rebuildCaskIndex,
  showBrewFailureToast,
  type AdoptCandidate,
  type AdoptTier,
  type AdoptableApp,
} from "./utils";

const SECTIONS: { tier: AdoptTier; title: string; subtitle?: string }[] = [
  { tier: "verified", title: "Ready to Adopt" },
  { tier: "likely", title: "Likely Adoptable", subtitle: "Preview adoption to make sure these adoptions match" },
  // Nothing here should be adopted on a keystroke: a version this far apart
  // usually means two unrelated apps that happen to share a name.
  { tier: "mismatched", title: "Unlikely Adoptions" },
];

export default function Main() {
  return (
    <ErrorBoundary>
      <AdoptList />
    </ErrorBoundary>
  );
}

/** Which slice of the scan the list is showing. */
enum AdoptFilter {
  adoptable = "adoptable",
  ignored = "ignored",
}

function AdoptList() {
  const { data, isLoading, error, revalidate, mutate } = useAdoptCandidates();
  const [filter, setFilter] = useState(AdoptFilter.adoptable);

  // Ignore state is written INTO the cached scan with `mutate`, not layered over
  // it in component state. The list is painted from that cache on the next
  // launch, before any rescan; an overlay that lived only in this component was
  // gone by then, so a just-ignored app came back with its direct Adopt action
  // until the rescan landed. `optimisticUpdate` persists synchronously (no
  // `cacheWriteDebounce` is set) and rolls back if the LocalStorage write fails.
  const setIgnored = (bundleId: string, ignored: boolean) =>
    mutate(ignored ? ignoreBundleId(bundleId) : stopIgnoringBundleId(bundleId), {
      optimisticUpdate: (current) =>
        (current ?? []).map((app) => (app.bundleId === bundleId ? { ...app, ignored } : app)),
      shouldRevalidateAfter: false,
    });
  // Drop the adopted row at once, then rescan quietly to confirm. The rescan no
  // longer puts up its own progress toast while a list is showing, so the
  // "Adopted" toast is not replaced the instant it appears — which is what
  // happened before: Raycast has one toast slot.
  const adopted = (appPath: string) => {
    void mutate(undefined, {
      optimisticUpdate: (current) => {
        const remaining = (current ?? []).filter((app) => app.path !== appPath);
        // Records that the drop ran and what it saw — the evidence to reach for
        // if an adopted row is ever reported lingering in the list.
        uiLogger.log("Dropped adopted row", { path: appPath, before: current?.length, after: remaining.length });
        return remaining;
      },
    });
  };

  // One adoption at a time. brew holds a lock for the whole run, so a second
  // would fail as "Brew is busy" — and a second confirmAndRun would take the
  // single toast slot from the first one's progress. The ref is the guard (a
  // pushed preview holds an old closure); the state drives what rows show.
  const adoptingRef = useRef<string | undefined>(undefined);
  const [adoptingPath, setAdoptingPath] = useState<string>();
  const beginAdoption = (appPath: string) => {
    if (adoptingRef.current !== undefined) return false;
    adoptingRef.current = appPath;
    setAdoptingPath(appPath);
    return true;
  };
  const endAdoption = () => {
    adoptingRef.current = undefined;
    setAdoptingPath(undefined);
  };
  const resetIgnored = () =>
    mutate(resetIgnoredApps(), {
      optimisticUpdate: (current) => (current ?? []).map((app) => ({ ...app, ignored: false })),
      shouldRevalidateAfter: false,
    });

  const scanned = data ?? [];
  const isIgnored = (app: AdoptableApp) => app.ignored;
  const ignoredApps = scanned.filter(isIgnored);
  const apps = filter === AdoptFilter.ignored ? ignoredApps : scanned.filter((app) => !isIgnored(app));

  // The index is missing or damaged. Deliberately NOT an empty list: that would
  // say nothing on this Mac is adoptable, which is a different claim.
  if (error?.name === "AdoptIndexUnavailableError") {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Download}
          title="The cask index needs to be rebuilt"
          description="Hit return to download and rebuild Homebrew's cask catalog."
          actions={
            <ActionPanel>
              <Action
                title="Rebuild Cask Index"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  await showToast({ style: Toast.Style.Animated, title: "Rebuilding cask index…" });
                  try {
                    await rebuildCaskIndex();
                    // Replace the animated toast rather than hiding it: a hide
                    // carries no id and would dismiss whatever is on screen.
                    await showToast({ style: Toast.Style.Success, title: "Cask index rebuilt" });
                    revalidate();
                  } catch (err) {
                    await showBrewFailureToast("Rebuild Failed", ensureError(err));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={filter === AdoptFilter.ignored ? "Filter ignored apps…" : "Filter apps…"}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Show adoptable or ignored apps"
          value={filter}
          onChange={(value) => setFilter(value as AdoptFilter)}
        >
          <List.Dropdown.Item value={AdoptFilter.adoptable} title="Adoptable" />
          <List.Dropdown.Item
            value={AdoptFilter.ignored}
            title={ignoredApps.length > 0 ? `Ignored (${ignoredApps.length})` : "Ignored"}
          />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={emptyTitle(filter, isLoading, ignoredApps.length)}
        description={emptyDescription(filter, isLoading, ignoredApps.length)}
        actions={
          <ActionPanel>
            {filter === AdoptFilter.ignored && ignoredApps.length === 0 && (
              <Action title="Show Adoptable Apps" icon={Icon.List} onAction={() => setFilter(AdoptFilter.adoptable)} />
            )}
            <RefreshAction onRefresh={revalidate} />
          </ActionPanel>
        }
      />
      {/* Ignored apps are one flat list: the tiers say how much to trust a
          match, which is not the question being asked of a dismissed app. */}
      {filter === AdoptFilter.ignored
        ? apps.length > 0 && (
            <List.Section title="Ignored" subtitle="These never appear as adoptable">
              {apps.map((app) => (
                <AdoptRow
                  key={app.path}
                  app={app}
                  ignored
                  onRefresh={revalidate}
                  onSetIgnored={setIgnored}
                  onResetIgnored={resetIgnored}
                  onAdopted={adopted}
                  adoptingPath={adoptingPath}
                  beginAdoption={beginAdoption}
                  endAdoption={endAdoption}
                />
              ))}
            </List.Section>
          )
        : SECTIONS.map(({ tier, title, subtitle }) => {
            const inSection = apps.filter((app) => app.candidates[0].tier === tier);
            if (inSection.length === 0) return null;
            return (
              <List.Section key={tier} title={title} subtitle={subtitle}>
                {inSection.map((app) => (
                  <AdoptRow
                    key={app.path}
                    app={app}
                    onRefresh={revalidate}
                    onSetIgnored={setIgnored}
                    onResetIgnored={resetIgnored}
                    onAdopted={adopted}
                    adoptingPath={adoptingPath}
                    beginAdoption={beginAdoption}
                    endAdoption={endAdoption}
                  />
                ))}
              </List.Section>
            );
          })}
    </List>
  );
}

/**
 * Empty-state copy. "Nothing to adopt" and "everything you have is ignored" are
 * different facts, and the second one names where the apps went.
 */
function emptyTitle(filter: AdoptFilter, isLoading: boolean, ignoredCount: number): string {
  if (isLoading) return "Looking for adoptable apps…";
  if (filter === AdoptFilter.ignored) return "No ignored apps";
  return ignoredCount > 0 ? "Nothing left to adopt" : "Nothing to adopt";
}

function emptyDescription(filter: AdoptFilter, isLoading: boolean, ignoredCount: number): string | undefined {
  if (isLoading) return undefined;
  if (filter === AdoptFilter.ignored) return "Apps you dismiss with ⌘⇧H show up here.";
  if (ignoredCount > 0) {
    return `Every remaining match is ignored — switch the filter to Ignored to see ${ignoredCount === 1 ? "it" : "them"}.`;
  }
  return "Every app Homebrew has a cask for is already installed through Homebrew.";
}

/** What stops this candidate being adoptable at all, in a few words. */
function blockerText(candidate: AdoptCandidate): string | undefined {
  if (candidate.missingComponents.length > 0) {
    return `Missing ${candidate.missingComponents.join(", ")}`;
  }
  if (candidate.conflicts.length > 0) {
    return `Conflicts with ${candidate.conflicts.join(", ")}`;
  }
  return undefined;
}

function AdoptRow(props: {
  app: AdoptableApp;
  /** Rendered under the Ignored filter, where the offer is to put it back. */
  ignored?: boolean;
  onRefresh: () => void;
  onSetIgnored: (bundleId: string, ignored: boolean) => Promise<unknown>;
  onResetIgnored: () => Promise<unknown>;
  onAdopted: (path: string) => void;
  /** The app an adoption is running for, if any. */
  adoptingPath?: string;
  beginAdoption: (path: string) => boolean;
  endAdoption: () => void;
}) {
  const {
    app,
    ignored: isIgnored = false,
    onRefresh,
    onSetIgnored,
    onResetIgnored,
    onAdopted,
    adoptingPath,
    beginAdoption,
    endAdoption,
  } = props;
  const busy = adoptingPath !== undefined;
  const isAdopting = adoptingPath === app.path;
  const { push } = useNavigation();
  const candidate = app.candidates[0];
  const blocked = blockerText(candidate);
  // Nothing checks this match: Homebrew skips its own comparison for an
  // auto_updates cask, and the cask publishes no matching id. Evidence-based,
  // not tier-based — a mismatched auto_updates row is just as unchecked, and
  // keying the warning on `tier === "likely"` left it off the confirmation.
  const unchecked = candidate.identity !== "confirms" && candidate.autoUpdates;
  // Direct adoption is for Ready to Adopt only; every other tier goes through
  // the preview, where a wrong match is recognizable.
  const previewOnly = candidate.tier !== "verified" || Boolean(blocked);

  // Everything that decided this row, so a wrong adoption can be traced back
  // to the evidence it was made on.
  const needsPassword = app.ownedByUser === false;
  const evidence = {
    app: app.name,
    path: app.path,
    bundleId: app.bundleId,
    installedVersion: app.version,
    token: candidate.token,
    caskVersion: candidate.caskVersion,
    tier: candidate.tier,
    identity: candidate.identity,
    relationship: candidate.relationship,
    autoUpdates: candidate.autoUpdates,
    ownedByUser: app.ownedByUser,
  };

  const adopt = async () => {
    if (!beginAdoption(app.path)) {
      // Only reachable from a preview pushed before another adoption began; the
      // running one's toast is on screen, so a second toast would steal its slot.
      actionsLogger.log("Adoption not started: another is running", { app: app.name });
      return;
    }
    try {
      await runAdoption();
    } finally {
      endAdoption();
    }
  };

  const runAdoption = async () => {
    // Touched by the askpass helper if sudo actually prompts during THIS run.
    // Unique per adoption and handed only to this brew process, so no other
    // command's password prompt can set it and no earlier run's can linger.
    const askpassMarker = path.join(os.tmpdir(), `brew-adopt-askpass-${randomUUID()}`);
    try {
      await adoptWith(askpassMarker);
    } finally {
      rmSync(askpassMarker, { force: true });
    }
  };

  const adoptWith = async (askpassMarker: string) => {
    actionsLogger.log("Adopting app", evidence);
    const ok = await confirmAndRun([brewAdoptCaskCommand(candidate.token)], {
      title: `Adopt ${app.name}`,
      // The list may be painted from cache, and the dialog stays open as long
      // as the user leaves it. If the app is gone by the time they confirm,
      // `--adopt` finds nothing at the target and does a fresh install instead
      // — so this runs AFTER the dialog, immediately before brew.
      beforeRun: async () => {
        if (existsSync(app.path)) return true;
        await showBrewFailureToast(
          `${app.name} Is No Longer Installed`,
          new Error(`${app.path} was not found. The list is being refreshed.`),
        );
        onRefresh();
        return false;
      },
      // confirmAndRun appends the exact command itself, so this is prose only.
      message: [
        `Homebrew will record this app as installed by ${candidate.token}.`,
        unchecked ? "Nothing has verified that they are the same software." : undefined,
        // "Will probably": ownership is only the likely cause. An ACL can make a
        // root-owned bundle writable, and sudo may still hold credentials.
        needsPassword
          ? "It is owned by root, so Homebrew will probably ask for your administrator password."
          : undefined,
      ]
        .filter(Boolean)
        .join(" "),
      labels: {
        progress: `Adopting ${app.name}…`,
        success: `Adopted ${app.name}`,
        failure: `Could Not Adopt ${app.name}`,
      },
      // Streamed, not buffered: brew's phase lines and a ticking clock, because
      // an adoption can run for half a minute with no other sign of life.
      run: async (_command, signal, report) => {
        // Monotonic: a wall clock can jump (NTP, sleep) mid-adoption.
        const started = performance.now();
        let phase = "Starting";
        const show = () => report(adoptProgressText(phase, performance.now() - started));
        show();
        const tick = setInterval(show, 1000);
        try {
          await execBrewWithProgress(
            brewAdoptCaskArgs(candidate.token),
            (progress) => {
              if (!isAdoptPhase(progress.message)) return;
              phase = progress.message;
              show();
            },
            signal,
            {
              packageName: candidate.token,
              // ponytail: generous fixed ceiling. The default kills brew after
              // 5 minutes of silence, and comparing a large bundle with
              // `diff --recursive` can be that quiet. Raise it if a real
              // adoption ever hits it.
              staleTimeoutMs: 30 * 60 * 1000,
              env: { BREW_ASKPASS_MARKER: askpassMarker },
            },
          );
        } finally {
          clearInterval(tick);
        }
      },
    });
    actionsLogger.log(ok ? "Adopted app" : "Adoption did not complete", evidence);
    if (!ok) return;
    onAdopted(app.path);
    // A password prompt takes focus from Raycast, so the success toast can land
    // in a window the user has already left. When one actually appeared, also
    // confirm with a HUD, which shows over whatever is in front. Keyed on the
    // prompt HAPPENING, not on ownership: sudo may still hold credentials, and
    // a HUD closes Raycast — pointless if the user never left it.
    if (existsSync(askpassMarker)) {
      actionsLogger.log("Adoption asked for a password", { app: app.name });
      await showHUD(`✅ Adopted ${app.name}`);
    }
  };

  // An app with no readable bundle id cannot be keyed, so the action is hidden
  // rather than offered and silently doing nothing.
  const bundleId = app.bundleId;
  const ignore = bundleId ? () => onSetIgnored(bundleId, true) : undefined;
  const stopIgnoring = bundleId ? () => onSetIgnored(bundleId, false) : undefined;

  // The preview is pushed from every row, ignored ones included, so it has to
  // know which: an ignored app's preview offers Stop Ignoring and no Adopt.
  const preview = () =>
    push(
      <AdoptPreview
        app={app}
        candidate={candidate}
        ignored={isIgnored}
        busy={busy}
        onAdopt={adopt}
        onIgnore={ignore}
        onStopIgnoring={stopIgnoring}
      />,
    );

  const accessories: List.Item.Accessory[] = [];
  if (isAdopting) {
    accessories.push({ tag: { value: "Adopting…", color: STATUS_COLOR.inProgress }, icon: IN_PROGRESS_ICON });
  } else if (blocked) {
    accessories.push({ tag: { value: blocked, color: STATUS_COLOR.error }, icon: UNINSTALLABLE_ICON });
  } else if (unchecked) {
    // Icon only: a filled "Unverified" tag on every row of a section whose
    // heading already says so shouted louder than the risk warrants.
    accessories.push({ icon: WARNING_ICON, tooltip: "Nothing but the name and version connects this app to the cask" });
  }
  accessories.push({ text: candidate.caskVersion ?? "—", tooltip: "Cask version" });

  return (
    <List.Item
      key={app.path}
      icon={{ fileIcon: app.path }}
      title={app.name}
      subtitle={app.version ?? "No version"}
      accessories={[{ text: candidate.token, tooltip: "Cask" }, ...accessories]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Under the Ignored filter the only sensible primary action is to
                put the app back; adopting something the user dismissed should
                not be one keystroke away. */}
            {isIgnored && stopIgnoring && <Action title="Stop Ignoring" icon={Icon.Eye} onAction={stopIgnoring} />}
            {isIgnored && (
              <Action
                title="Reset Ignored Apps"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={onResetIgnored}
              />
            )}
            {/* Unverified matches go through the preview, which is where a wrong
                one is recognizable; verified ones can adopt straight away. */}
            {/* Direct Adopt is offered ONLY for a verified, unblocked, NOT-ignored
                row. Written as one positive condition on purpose: the earlier
                `!isIgnored && previewOnly ? preview : adopt` fell through to the
                adopt branch for every ignored row, so an ignored Likely match
                could skip its mandatory preview. */}
            {!isIgnored && !previewOnly && !busy && (
              <Action title={`Adopt ${app.name}`} icon={Icon.Download} onAction={adopt} />
            )}
            {/* ⌘⇧I is "Preview" everywhere in this extension — Preview Install,
                Preview Upgrades — so Preview Adoption takes it too. */}
            <Action
              title="Preview Adoption"
              icon={Icon.Eye}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              onAction={preview}
            />
            {!isIgnored && ignore && (
              <Action
                title="Ignore This App"
                icon={Icon.EyeDisabled}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                onAction={ignore}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.ShowInFinder path={app.path} shortcut={Keyboard.Shortcut.Common.Open} />
            <Action.CopyToClipboard
              title="Copy Adopt Command"
              content={brewAdoptCaskCommand(candidate.token)}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {app.candidates.length > 1 && (
              <Action.CopyToClipboard
                title={
                  app.candidates.length === 2
                    ? "Copy the Other Cask"
                    : `Copy the Other ${app.candidates.length - 1} Casks`
                }
                content={app.candidates
                  .slice(1)
                  .map((other) => other.token)
                  .join("\n")}
              />
            )}
            {/* Hidden while an adoption runs. A refresh that fails puts up a
                failure toast, and the adoption's once-a-second progress update
                would overwrite its message — the one toast source that can land
                under the ticker. The adoption refreshes the list when it ends. */}
            {!busy && <RefreshAction onRefresh={onRefresh} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
