import { Action, ActionPanel, Icon, List, popToRoot, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { lazy, Suspense } from "react";
import { readCachedState } from "../lib/cache";
import { reportError } from "../lib/errors";
import { klack } from "../lib/klack";
import { labelFor, tintForVolume } from "../lib/volume-display";

const CustomVolumeForm = lazy(() => import("./custom-volume-form"));

const STEPS = Array.from({ length: 21 }, (_, i) => i * 5);

export function VolumeScrubber() {
  const {
    data: current,
    isLoading,
    mutate,
  } = useCachedPromise(klack.currentVolume, [], {
    keepPreviousData: true,
    initialData: readCachedState()?.volume,
  });

  async function setTo(value: number) {
    try {
      if (current === value) {
        await showHUD(`Volume is already at ${value}%`);
      } else {
        await mutate(klack.setVolume(value), { optimisticUpdate: () => value, shouldRevalidateAfter: false });
        await showHUD(`Volume set to ${value}%`);
      }
      await popToRoot();
    } catch (err) {
      await reportError(err);
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle="Set Volume" searchBarPlaceholder="Filter steps">
      {STEPS.map((step) => (
        <List.Item
          key={step}
          title={`${step}%`}
          subtitle={labelFor(step)}
          accessories={step === current ? [{ tag: "Current" }] : undefined}
          icon={{ source: Icon.Dot, tintColor: tintForVolume(step) }}
          actions={
            <ActionPanel>
              <Action title={`Set Volume to ${step}%`} icon={Icon.Check} onAction={() => setTo(step)} />
              <Action.Push
                title="Set Custom Volume…"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
                target={
                  <Suspense fallback={null}>
                    <CustomVolumeForm initial={current ?? step} onSubmit={setTo} />
                  </Suspense>
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
