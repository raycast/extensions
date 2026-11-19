import { Action, ActionPanel, Detail, environment, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { randomUUID } from "node:crypto";
import { useRef, useState } from "react";
import { DrinkFields, selectDrink } from "./components/drink-fields";
import type { CaffeineIntake, Settings } from "./types";
import { calculateCaffeineMetrics, getBedtimeDate } from "./utils/caffeineModel";
import { getDrinkPresets, servingDescription } from "./utils/drinkPresets";
import { positiveAmount } from "./utils/intakeData";
import { parseIntakeFromForm } from "./utils/intakeValidation";
import { getSettings } from "./utils/preferences";
import { formatMg, timelineMarkdown } from "./utils/statsSvg";
import { getStatusMessage } from "./utils/statusHelpers";
import { getCustomDrinks, getIntakes, saveIntake } from "./utils/storage";

function LoggingResult({
  intake,
  previous,
  settings,
}: {
  intake: CaffeineIntake;
  previous: CaffeineIntake[];
  settings: Settings;
}) {
  const { pop } = useNavigation();
  const now = new Date();
  const bedtime = getBedtimeDate(settings.bedtime, false, now);
  const intakes = [...previous, intake];
  const result = calculateCaffeineMetrics(previous, settings, intake.amount, intake.timestamp, now);

  return (
    <Detail
      navigationTitle="Caffeine Logged"
      markdown={[
        timelineMarkdown({ intakes, now, bedtime, settings, appearance: environment.appearance }),
        `**Logged** · ${formatMg(intake.amount)} · **Today’s intake** · ${formatMg(result.todayTotal)}`,
        `**Estimated at bedtime before this drink** · ${formatMg(result.predictedResidualAtBedtime)} · ${getStatusMessage(result.status)}`,
      ].join("\n\n")}
      actions={
        <ActionPanel>
          <Action title="Log Another" icon={Icon.Plus} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

export default function LogCaffeine() {
  const { push } = useNavigation();
  const [selection, setSelection] = useState(() => selectDrink());
  const [intakeTime, setIntakeTime] = useState<Date | null>(() => new Date());
  const [amountDescription, setAmountDescription] = useState("");
  const saving = useRef(false);
  const { data: customDrinks, isLoading } = useCachedPromise(getCustomDrinks);
  const settings = getSettings();

  async function handleSubmit() {
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
      push(<LoggingResult intake={intake} previous={previous} settings={settings} />);
      setSelection(selectDrink());
      setIntakeTime(new Date());
      setAmountDescription("");
      await showToast({
        style: Toast.Style.Success,
        title: `Logged ${intake.drinkType}`,
        message: formatMg(intake.amount),
      });
    } catch (error) {
      await showFailureToast(error, { title: "Couldn’t log caffeine" });
    } finally {
      saving.current = false;
    }
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
      <Form.TextField
        id="amountDescription"
        title="Serving Note"
        placeholder="Optional"
        value={amountDescription}
        onChange={setAmountDescription}
      />
    </Form>
  );
}
