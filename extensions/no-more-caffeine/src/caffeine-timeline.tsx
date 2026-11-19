import { Action, ActionPanel, Detail, environment, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { EditIntakeForm } from "./components/edit-intake";
import WhatIf from "./what-if";
import type { CaffeineIntake } from "./types";
import {
  calculateLastCupBy,
  calculateTodayTotal,
  calculateTotalResidualCaffeine,
  getBedtimeDate,
} from "./utils/caffeineModel";
import { BUILT_IN_PRESETS } from "./utils/drinkPresets";
import { getSettings } from "./utils/preferences";
import { formatDateTime, formatMg, lastCupMarkdown, timelineBounds, timelineMarkdown } from "./utils/statsSvg";
import { getIntakes } from "./utils/storage";

type TimelineBounds = ReturnType<typeof timelineBounds>;

function isTimelineDrink({ timestamp }: CaffeineIntake, { start, end }: TimelineBounds) {
  return +timestamp >= start && +timestamp <= end;
}

function TimelineDrinks({ bounds, onSave }: { bounds: TimelineBounds; onSave: () => void }) {
  const { data: intakes, error, isLoading, revalidate } = usePromise(getIntakes);
  const drinks =
    isLoading || error
      ? []
      : (intakes ?? []).filter((intake) => isTimelineDrink(intake, bounds)).sort((a, b) => +b.timestamp - +a.timestamp);

  function refreshAfterEdit() {
    void revalidate();
    onSave();
  }

  return (
    <List navigationTitle="Timeline Drinks" searchBarPlaceholder="Search drinks…" isLoading={isLoading}>
      {!isLoading && error && (
        <List.EmptyView
          title="Couldn’t Load Timeline Drinks"
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {drinks.map((intake) => (
        <List.Item
          key={intake.id}
          title={intake.drinkType}
          subtitle={formatDateTime(intake.timestamp)}
          accessories={[{ text: formatMg(intake.amount) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Intake"
                icon={Icon.Pencil}
                target={<EditIntakeForm intake={intake} onSave={refreshAfterEdit} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function CaffeineTimeline({ navigationTitle }: { navigationTitle?: string } = {}) {
  const { data: intakes, isLoading, revalidate, error } = useCachedPromise(getIntakes);
  const settings = getSettings();
  const now = new Date();
  const bedtime = getBedtimeDate(settings.bedtime, false, now);
  const bounds = timelineBounds(now, bedtime);
  const hasTimelineDrinks = intakes?.some((intake) => isTimelineDrink(intake, bounds));
  const coffee = BUILT_IN_PRESETS[0];
  const cutoff =
    intakes &&
    calculateLastCupBy({
      amount: coffee.defaultCaffeineMg,
      baseline: calculateTotalResidualCaffeine(intakes, bedtime, settings.halfLife),
      bedtime,
      halfLife: settings.halfLife,
      threshold: settings.maxCaffeineAtBedtime,
    });

  return (
    <Detail
      navigationTitle={navigationTitle}
      isLoading={isLoading}
      markdown={
        intakes
          ? [
              timelineMarkdown({
                intakes,
                now,
                bedtime,
                settings,
                appearance: environment.appearance,
                lastCup: { cutoff },
              }),
              `**Today’s intake** · ${formatMg(calculateTodayTotal(intakes, now))} · **Next bedtime** · ${formatDateTime(bedtime)}`,
              lastCupMarkdown(cutoff, now, coffee.name, coffee.defaultCaffeineMg),
              "The cutoff allows time for the drink to peak by bedtime. Forecasts are estimates.",
            ].join("\n\n")
          : error
            ? "The intake history couldn’t be loaded."
            : ""
      }
      actions={
        <ActionPanel>
          <Action.Push title="Simulate a Drink" icon={Icon.Wand} target={<WhatIf navigationTitle="What If" />} />
          {hasTimelineDrinks && (
            <Action.Push
              title="Edit a Timeline Drink"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<TimelineDrinks bounds={bounds} onSave={revalidate} />}
            />
          )}
          <Action title="Change Bedtime or Threshold" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
