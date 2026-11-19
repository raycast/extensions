import { Action, ActionPanel, Detail, environment, Form, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { DrinkFields, selectDrink } from "./components/drink-fields";
import type { CaffeineIntake } from "./types";
import { calculateCaffeineMetrics, getBedtimeDate } from "./utils/caffeineModel";
import { getDrinkPresets, servingDescription } from "./utils/drinkPresets";
import { positiveAmount } from "./utils/intakeData";
import { parseIntakeFromForm } from "./utils/intakeValidation";
import { getSettings } from "./utils/preferences";
import { formatMg, timelineMarkdown } from "./utils/statsSvg";
import { getStatusMessage } from "./utils/statusHelpers";
import { getCustomDrinks, getIntakes, saveIntake } from "./utils/storage";

export default function LogCaffeine() {
  const [selection, setSelection] = useState(() => selectDrink());
  const [intakeTime, setIntakeTime] = useState<Date | null>(() => new Date());
  const [saved, setSaved] = useState<{ intake: CaffeineIntake; previous: CaffeineIntake[] }>();
  const saving = useRef(false);
  const { data: customDrinks, isLoading } = useCachedPromise(getCustomDrinks);
  const settings = getSettings();

  async function handleSubmit({ amountDescription }: { amountDescription: string }) {
    if (saving.current) return;
    const parsed = parseIntakeFromForm(selection.caffeine, intakeTime, new Date());
    if (!parsed) return;

    saving.current = true;
    try {
      const previous = await getIntakes();
      const preset = getDrinkPresets(customDrinks).find(({ id }) => id === selection.id);
      const intake: CaffeineIntake = {
        id: randomUUID(),
        timestamp: parsed.chosenTime,
        amount: parsed.caffeineMg,
        drinkType: preset?.name ?? "Other",
        amountDescription: amountDescription.trim() || servingDescription(positiveAmount(selection.volume)),
      };

      await saveIntake(intake);
      setSaved({ intake, previous });
      await showToast({
        style: Toast.Style.Success,
        title: `Logged ${intake.drinkType}`,
        message: formatMg(intake.amount),
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Couldn’t log caffeine", message: String(error) });
    } finally {
      saving.current = false;
    }
  }

  if (saved) {
    const now = new Date();
    const bedtime = getBedtimeDate(settings.bedtime, false, now);
    const all = [...saved.previous, saved.intake];
    const result = calculateCaffeineMetrics(saved.previous, settings, saved.intake.amount, saved.intake.timestamp, now);

    return (
      <Detail
        navigationTitle="Caffeine Logged"
        markdown={[
          timelineMarkdown({ intakes: all, now, bedtime, settings, appearance: environment.appearance }),
          `**Logged** · ${formatMg(saved.intake.amount)} · **Today’s intake** · ${formatMg(result.todayTotal)}`,
          `**Estimated at bedtime before this drink** · ${formatMg(result.predictedResidualAtBedtime)} · ${getStatusMessage(result.status)}`,
        ].join("\n\n")}
        actions={
          <ActionPanel>
            <Action
              title="Log Another"
              icon={Icon.Plus}
              onAction={() => {
                setSaved(undefined);
                setSelection(selectDrink());
                setIntakeTime(new Date());
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Log Caffeine" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <DrinkFields selection={selection} onChange={setSelection} customDrinks={customDrinks} />
      <Form.DatePicker
        id="intakeTime"
        title="Time"
        type={Form.DatePicker.Type.DateTime}
        value={intakeTime}
        onChange={setIntakeTime}
      />
      <Form.TextField id="amountDescription" title="Serving Note" placeholder="Optional" />
    </Form>
  );
}
