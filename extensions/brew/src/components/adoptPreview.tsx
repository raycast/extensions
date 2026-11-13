/**
 * Preview Adoption — the same shape as Preview Upgrade: what changes, as rows.
 *
 * **There is no Homebrew-side preview to show.** `brew install --cask --adopt
 * --dry-run <token>` prints only `==> Would install 1 cask:` and the token
 * (verified against Homebrew 7.0.6): it never downloads, so it never reaches
 * the `Info.plist` comparison in `cask/artifact/moved.rb:95-125` and says
 * nothing about the app already on disk. So this is assembled from what the
 * scan knows.
 *
 * Mandatory before adopting from Likely, where nothing but the name and the
 * version connects the app to the cask. Its job is recognition — the location,
 * the two versions and what checked them, so a wrong match is visible at a
 * glance rather than argued in prose.
 */

import { Action, ActionPanel, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import type { AdoptCandidate, AdoptableApp } from "../utils";
import { STATUS_COLOR, WARNING_ICON } from "./palette";

export interface AdoptPreviewProps {
  app: AdoptableApp;
  candidate: AdoptCandidate;
  /** Pushed from the Ignored filter: offer Stop Ignoring, never Adopt. */
  ignored?: boolean;
  /** Another adoption is running — brew's lock would refuse a second. */
  busy?: boolean;
  onAdopt: () => void;
  onIgnore?: () => Promise<unknown>;
  onStopIgnoring?: () => Promise<unknown>;
}

/** What checked that this app is this cask, in a few words. */
export function verificationLabel(candidate: AdoptCandidate): string {
  if (candidate.identity === "confirms") return "The cask's bundle identifier";
  if (!candidate.autoUpdates) return "Homebrew, during adoption";
  return "Name and version only";
}

/** The version transition, in Preview Upgrade's notation. */
function versionText(app: AdoptableApp, candidate: AdoptCandidate): string {
  const installed = app.version ?? "Unknown";
  const cask = candidate.caskVersion ?? "Unknown";
  return installed === cask ? installed : `${installed} → ${cask}`;
}

export function AdoptPreview(props: AdoptPreviewProps) {
  const { app, candidate, ignored = false, busy = false, onAdopt, onIgnore, onStopIgnoring } = props;
  const { pop } = useNavigation();
  const unverified = candidate.identity !== "confirms" && candidate.autoUpdates;
  const blockers = [
    ...candidate.missingComponents.map((component) => `${component} is missing from this copy`),
    ...candidate.conflicts.map((token) => `${token} is installed and conflicts`),
  ];

  const actions = (
    <ActionPanel>
      <ActionPanel.Section>
        {ignored
          ? onStopIgnoring && (
              <Action
                title="Stop Ignoring"
                icon={Icon.Eye}
                onAction={async () => {
                  await onStopIgnoring();
                  pop();
                }}
              />
            )
          : blockers.length === 0 &&
            !busy && <Action title={`Adopt ${app.name}`} icon={Icon.Download} onAction={onAdopt} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.ShowInFinder path={app.path} shortcut={Keyboard.Shortcut.Common.Open} />
        {/* Below Show in Finder, not beside Adopt: when Adopt is unavailable
            (blocked, or another adoption running) the first action is the one
            Enter fires, and it must not be a quiet dismissal. */}
        {!ignored && onIgnore && (
          <Action
            title="Ignore This App"
            icon={Icon.EyeDisabled}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
            onAction={async () => {
              // Back to the list, where the row has already moved to Ignored.
              await onIgnore();
              pop();
            }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List navigationTitle={`Preview Adoption: ${app.name}`}>
      <List.Section title={`Would adopt ${app.name}`}>
        <List.Item
          icon={{ fileIcon: app.path }}
          title={app.name}
          subtitle={versionText(app, candidate)}
          accessories={[{ text: candidate.token }]}
          actions={actions}
        />
      </List.Section>

      <List.Section title="Details">
        <List.Item icon={Icon.Folder} title="Location" subtitle={app.path} actions={actions} />
        <List.Item icon={Icon.Box} title="Cask" subtitle={candidate.token} actions={actions} />
        {app.ownedByUser === false && (
          <List.Item
            icon={{ source: Icon.Key, tintColor: STATUS_COLOR.attention }}
            title="Needs your password"
            subtitle="Owned by root — Homebrew will probably ask for your administrator password"
            actions={actions}
          />
        )}
        <List.Item
          icon={unverified ? WARNING_ICON : { source: Icon.CheckCircle, tintColor: STATUS_COLOR.ok }}
          title="Match verified by"
          subtitle={verificationLabel(candidate)}
          actions={actions}
        />
      </List.Section>

      {blockers.length > 0 && (
        <List.Section title="Cannot adopt">
          {blockers.map((blocker) => (
            <List.Item
              key={blocker}
              icon={{ source: Icon.XMarkCircle, tintColor: STATUS_COLOR.error }}
              title={blocker}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      <List.Section title="After adopting">
        <List.Item
          icon={Icon.ArrowUpCircle}
          title="brew upgrade can replace this app with the cask's build"
          actions={actions}
        />
        <List.Item icon={Icon.Trash} title={`brew uninstall --cask ${candidate.token} deletes it`} actions={actions} />
      </List.Section>
    </List>
  );
}
