import { Form, ActionPanel, Action, showToast, Toast, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { saveIntake, getIntakes, getCustomDrinks } from "./utils/storage";
import { BUILT_IN_PRESETS, OTHER_OPTION } from "./utils/drinkPresets";
import { calculateCaffeineMetrics } from "./utils/caffeineModel";
import { getSettings } from "./utils/preferences";
import { getStatusEmoji, getStatusMessage } from "./utils/statusHelpers";
import { CaffeineIntake, CaffeineCalculation } from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

interface FormValues {
  drinkType: string;
  amountDescription: string;
  caffeineAmount: string;
}

export default function Command() {
  const [drinkType, setDrinkType] = useState<string>("");
  const [caffeineAmount, setCaffeineAmount] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [calculation, setCalculation] = useState<CaffeineCalculation | null>(null);

  const { data: intakes, revalidate: revalidateIntakes } = useCachedPromise(getIntakes);
  const { data: customDrinks } = useCachedPromise(getCustomDrinks);

  const settings = getSettings();

  useEffect(() => {
    if (!drinkType || drinkType === OTHER_OPTION) {
      setCaffeineAmount("");
      return;
    }

    const builtIn = BUILT_IN_PRESETS.find((p) => p.name === drinkType);
    if (builtIn) {
      setCaffeineAmount(builtIn.defaultCaffeineMg.toString());
      return;
    }

    if (customDrinks) {
      const custom = customDrinks.find((d) => d.id === drinkType);
      if (custom) {
        setCaffeineAmount(custom.defaultCaffeineMg.toString());
        return;
      }
    }
  }, [drinkType, customDrinks]);

  async function handleSubmit(values: FormValues) {
    const caffeineMg = parseFloat(values.caffeineAmount);
    if (isNaN(caffeineMg) || caffeineMg <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid caffeine amount",
        message: "Please enter a valid positive number",
      });
      return;
    }

    try {
      const metrics = calculateCaffeineMetrics(intakes || [], settings, caffeineMg);
      setCalculation(metrics);

      const intake: CaffeineIntake = {
        id: generateId(),
        timestamp: new Date(),
        amount: caffeineMg,
        drinkType: values.drinkType === OTHER_OPTION ? "Other" : values.drinkType,
        amountDescription: values.amountDescription || undefined,
      };

      await saveIntake(intake);
      await revalidateIntakes();
      setSubmitted(true);

      showToast({
        style: Toast.Style.Success,
        title: "Caffeine logged",
        message: `${caffeineMg}mg logged successfully`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to log caffeine",
      });
    }
  }

  if (submitted && calculation) {
    const statusEmoji = getStatusEmoji(calculation.status);
    const statusMessage = getStatusMessage(calculation.status);

    return (
      <Detail
        markdown={`# ${statusEmoji} ${statusMessage}

## Summary

**Current Residual Caffeine:** ${calculation.currentResidual.toFixed(1)} mg

**Predicted Residual at Bedtime (with this drink):** ${calculation.predictedResidualAtBedtimeWithNewDrink?.toFixed(1) || "N/A"} mg

**Today's Total Intake:** ${calculation.todayTotal.toFixed(1)} mg

---

## Details

- **Status:** ${statusMessage}
- **Current Residual:** ${calculation.currentResidual.toFixed(1)} mg
- **Predicted at Bedtime (without new drink):** ${calculation.predictedResidualAtBedtime.toFixed(1)} mg
- **Predicted at Bedtime (with new drink):** ${calculation.predictedResidualAtBedtimeWithNewDrink?.toFixed(1) || "N/A"} mg

${calculation.status === "no-more-caffeine" ? "⚠️ **Warning:** Consuming this caffeine may disturb your sleep!" : ""}
${calculation.status === "warning" ? "⚠️ **Caution:** You're approaching your caffeine limit." : ""}
${calculation.status === "safe" ? "✅ **Safe:** You can consume this caffeine without significant sleep impact." : ""}
`}
        actions={
          <ActionPanel>
            <Action
              title="Log Another"
              icon={Icon.Plus}
              onAction={() => {
                setSubmitted(false);
                setCalculation(null);
                setDrinkType("");
                setCaffeineAmount("");
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Log Caffeine" icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="drinkType" title="Drink Type" value={drinkType} onChange={setDrinkType}>
        {BUILT_IN_PRESETS.length > 0 && (
          <Form.Dropdown.Section title="Built-in Presets">
            {BUILT_IN_PRESETS.map((preset) => (
              <Form.Dropdown.Item key={preset.name} title={preset.name} value={preset.name} />
            ))}
          </Form.Dropdown.Section>
        )}
        {customDrinks && customDrinks.length > 0 && (
          <Form.Dropdown.Section title="Custom Drinks">
            {customDrinks.map((drink) => (
              <Form.Dropdown.Item key={drink.id} title={drink.name} value={drink.id} />
            ))}
          </Form.Dropdown.Section>
        )}
        <Form.Dropdown.Item title="Other" value={OTHER_OPTION} />
      </Form.Dropdown>

      <Form.TextField
        id="amountDescription"
        title="Amount (Optional)"
        placeholder="e.g., 1 cup, 200ml, 1 can"
        info="Optional description of the amount consumed"
      />

      <Form.TextField
        id="caffeineAmount"
        title="Caffeine Amount (mg)"
        placeholder="Enter caffeine amount in milligrams"
        value={caffeineAmount}
        onChange={setCaffeineAmount}
        info="Auto-filled for presets, but can be edited"
      />
    </Form>
  );
}
