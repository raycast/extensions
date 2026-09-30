/**
 * Empty-view gate for commands that require a newer Homebrew major than the
 * user has installed. Wrapped in its own `<List>` because callers return this
 * in place of their whole view.
 */

import React from "react";
import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useBrewMajorVersion } from "../hooks/useBrewMajorVersion";
import { confirmAndRun, invalidateBrewMajorVersion } from "../utils";
import { STATUS_COLOR } from "./palette";

export function RequiresHomebrew(props: { major: number; feature: string; onUpdated?: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: STATUS_COLOR.attention }}
        title={`${props.feature} needs Homebrew ${props.major}`}
        description={`Homebrew ${props.major} or newer was not found. Update Homebrew runs \`brew update\`, which also updates Homebrew itself.`}
        actions={
          <ActionPanel>
            <Action
              title="Update Homebrew"
              icon={Icon.Download}
              onAction={async () => {
                const ok = await confirmAndRun(["brew update"], { title: "Update Homebrew?" });
                if (ok) {
                  invalidateBrewMajorVersion();
                  props.onUpdated?.();
                }
              }}
            />
            <Action.CopyToClipboard
              title="Copy Command"
              content="brew update"
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * The whole "does this machine have a new enough Homebrew" gate, so a command
 * is one wrapper element rather than eight lines of the same branch.
 *
 * `loading` is the caller's own placeholder because it has to be the right
 * SHAPE — a `<Detail isLoading />` for a detail command, a `<List isLoading />`
 * for a list one — and swapping the container mid-flight flickers.
 */
export function HomebrewGate(props: {
  major: number;
  feature: string;
  // Typed off the component they render into: @raycast/api bundles its own
  // @types/react copy, and a bare React.ReactNode is not assignable across the two.
  loading: React.ComponentProps<typeof List>["children"];
  children: React.ComponentProps<typeof List>["children"];
}) {
  const { major, isLoading, revalidate } = useBrewMajorVersion();

  if (isLoading) return <>{props.loading}</>;
  if (major === undefined || major < props.major) {
    return <RequiresHomebrew major={props.major} feature={props.feature} onUpdated={revalidate} />;
  }
  return <>{props.children}</>;
}
