import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { magpie } from "./lib/exec";
import { parseConfirmation, parseProfiles } from "./lib/parse";
import { reportMagpieError } from "./lib/report-error";
import { useMagpie } from "./lib/use-magpie";

type Preferences = { binaryPath?: string };

export default function Profiles() {
  const { isLoading, data, error, revalidate } = useMagpie(
    ["profiles"],
    parseProfiles,
  );
  const { binaryPath } = getPreferenceValues<Preferences>();
  const [busy, setBusy] = useState<string>();
  const busyRef = useRef(false);

  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);

  async function apply(name: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(name);
    try {
      const stdout = await magpie(binaryPath, ["use", name]);
      const note = parseConfirmation(stdout);
      await showToast({
        style: Toast.Style.Success,
        title: note.summary,
        message: note.notice,
      });
      revalidate();
    } catch (caught) {
      await reportMagpieError(caught);
    } finally {
      busyRef.current = false;
      setBusy(undefined);
    }
  }

  return (
    <List
      isLoading={isLoading || busy !== undefined}
      searchBarPlaceholder="Search profiles"
    >
      {error && !data ? (
        <List.EmptyView
          title="Couldn't list profiles"
          description={error.message}
        />
      ) : data?.empty ? (
        <List.EmptyView
          title="No profiles"
          description="Save one in the terminal with magpie save <name>."
        />
      ) : (
        data?.profiles.map((profile) => (
          <List.Item
            key={profile.name}
            icon={Icon.Document}
            title={profile.name}
            subtitle={profile.summary || undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Use Profile"
                  icon={Icon.Check}
                  onAction={() => apply(profile.name)}
                />
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
