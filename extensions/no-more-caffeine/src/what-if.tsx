import { Action, ActionPanel, Detail, environment, Form, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DrinkFields, selectDrink } from "./components/drink-fields";
import type { CaffeineIntake } from "./types";
import {
  calculateLastCupBy,
  calculateTotalResidualCaffeine,
  getBedtimeDate,
  HOUR,
  hoursToPeak,
  MINUTE,
} from "./utils/caffeineModel";
import { getDrinkPresets, OTHER_OPTION } from "./utils/drinkPresets";
import { positiveAmount } from "./utils/intakeData";
import { getSettings } from "./utils/preferences";
import { formatDateTime, formatMg, lastCupMarkdown, timelineMarkdown } from "./utils/statsSvg";
import { getCustomDrinks, getIntakes } from "./utils/storage";

function readLaunchedSimulation(context: unknown, bedtime: Date): CaffeineIntake | undefined {
  if (!context || typeof context !== "object" || !("drinkAt" in context) || typeof context.drinkAt !== "string") {
    return undefined;
  }
  const timestamp = new Date(context.drinkAt);
  const amount = "caffeineMg" in context ? positiveAmount(context.caffeineMg) : undefined;
  if (amount === undefined || !Number.isFinite(+timestamp) || timestamp > bedtime) return undefined;
  return { id: "simulation", timestamp, amount, drinkType: "Other" };
}

export default function WhatIf({ launchContext }: { launchContext?: unknown } = {}) {
  const { data: intakes, isLoading, revalidate, error } = useCachedPromise(getIntakes);
  const { data: customDrinks } = useCachedPromise(getCustomDrinks);
  const [now] = useState(() => new Date());
  const settings = getSettings();
  const bedtime = getBedtimeDate(settings.bedtime, false, now);
  const [simulation, setSimulation] = useState(() => readLaunchedSimulation(launchContext, bedtime));
  const [selection, setSelection] = useState(() =>
    simulation ? { ...selectDrink(OTHER_OPTION), caffeine: String(simulation.amount) } : selectDrink(),
  );
  const [time, setTime] = useState<Date | null>(simulation?.timestamp ?? now);

  async function preview() {
    const amount = positiveAmount(selection.caffeine);
    if (amount === undefined) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a positive caffeine amount" });
      return;
    }
    if (!time || !Number.isFinite(+time) || time > bedtime) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a drink time at or before the next bedtime" });
      return;
    }
    const drinkType = getDrinkPresets(customDrinks).find(({ id }) => id === selection.id)?.name ?? "Other";
    setSimulation({ id: "simulation", timestamp: time, amount, drinkType });
  }

  if (simulation && intakes) {
    const baseline = calculateTotalResidualCaffeine(intakes, bedtime, settings.halfLife);
    const cutoff = calculateLastCupBy({
      amount: simulation.amount,
      baseline,
      bedtime,
      halfLife: settings.halfLife,
      threshold: settings.maxCaffeineAtBedtime,
    });
    const peak = new Date(+simulation.timestamp + hoursToPeak(settings.halfLife) * HOUR);
    const shift = (minutes: number) => {
      const timestamp = new Date(+simulation.timestamp + minutes * MINUTE);
      setSimulation({ ...simulation, timestamp });
      setTime(timestamp);
    };

    return (
      <Detail
        navigationTitle="What If"
        isLoading={isLoading}
        markdown={[
          timelineMarkdown({
            intakes,
            now,
            bedtime,
            settings,
            simulation,
            appearance: environment.appearance,
            lastCup: { cutoff },
          }),
          `**Simulated drink** · ${formatMg(simulation.amount)} · ${formatDateTime(simulation.timestamp)}`,
          lastCupMarkdown(cutoff, now, "this drink", simulation.amount),
          peak > bedtime
            ? `The added drink is estimated to peak **after bedtime**, around ${formatDateTime(peak)}.`
            : "",
          "These figures are estimates. This scenario is unsaved.",
        ]
          .filter(Boolean)
          .join("\n\n")}
        actions={
          <ActionPanel>
            <Action title="Edit Scenario" icon={Icon.Pencil} onAction={() => setSimulation(undefined)} />
            <Action title="Move Drink 15 Minutes Earlier" icon={Icon.ArrowLeft} onAction={() => shift(-15)} />
            {+simulation.timestamp + 15 * MINUTE <= +bedtime && (
              <Action title="Move Drink 15 Minutes Later" icon={Icon.ArrowRight} onAction={() => shift(15)} />
            )}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="What If"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {intakes ? (
            <Action.SubmitForm title="Preview at Bedtime" icon={Icon.LineChart} onSubmit={preview} />
          ) : (
            <Action title="Reload Intake History" icon={Icon.ArrowClockwise} onAction={revalidate} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description
        text={error ? "The intake history couldn’t be loaded." : `Next bedtime is ${formatDateTime(bedtime)}.`}
      />
      <DrinkFields selection={selection} onChange={setSelection} customDrinks={customDrinks} />
      <Form.DatePicker
        id="time"
        title="Drink Time"
        type={Form.DatePicker.Type.DateTime}
        value={time}
        onChange={setTime}
      />
    </Form>
  );
}
