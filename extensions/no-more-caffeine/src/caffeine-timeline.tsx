import { Action, ActionPanel, Detail, environment, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
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

function TimelineDrinks({ intakes, onSave }: { intakes: CaffeineIntake[]; onSave: () => void }) {
  return (
    <List navigationTitle="Timeline Drinks" searchBarPlaceholder="Search drinks…">
      {intakes.map((intake) => (
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
                target={<EditIntakeForm intake={intake} onSave={onSave} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function CaffeineTimeline() {
  const { data: intakes, isLoading, revalidate, error } = useCachedPromise(getIntakes);
  const settings = getSettings();
  const now = new Date();
  const bedtime = getBedtimeDate(settings.bedtime, false, now);
  const { start, end } = timelineBounds(now, bedtime);
  const timelineDrinks = intakes
    ?.filter(({ timestamp }) => +timestamp >= start && +timestamp <= end)
    .sort((a, b) => +b.timestamp - +a.timestamp);
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
      navigationTitle="Caffeine Timeline"
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
          <Action.Push title="Simulate a Drink" icon={Icon.Wand} target={<WhatIf />} />
          {!!timelineDrinks?.length && (
            <Action.Push
              title="Edit a Timeline Drink"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<TimelineDrinks intakes={timelineDrinks} onSave={revalidate} />}
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
