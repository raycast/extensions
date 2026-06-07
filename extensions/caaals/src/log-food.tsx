import { Action, ActionPanel, Detail, Form, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { analyzeText, createDiaryFromSnapshot } from "./api";
import type { AIFoodAnalysisResult, MealType } from "./types";
import {
  formatMealType,
  formatServingWithQuantity,
  getDefaultMeal,
  getDefaultServing,
  MEAL_ICONS,
  MEALS,
} from "./utils";

export default function LogFood() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  async function handleSubmit(values: { description: string; meal: MealType }) {
    if (!values.description.trim()) {
      setDescriptionError("Description is required");
      return;
    }
    if (values.description.trim().length < 2) {
      setDescriptionError("At least 2 characters");
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Analyzing food..." });

    try {
      const result = await analyzeText(values.description.trim());
      toast.hide();
      push(<FoodConfirmation result={result} meal={values.meal} />);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Analysis Failed";
      toast.message = err instanceof Error ? err.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze Food" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="What did you eat?"
        placeholder="e.g. 200g chicken breast with rice and salad"
        error={descriptionError}
        onChange={() => {
          if (descriptionError) setDescriptionError(undefined);
        }}
        onBlur={(event) => {
          const val = event.target.value?.trim() ?? "";
          if (val.length === 0) {
            setDescriptionError("Description is required");
          } else if (val.length < 2) {
            setDescriptionError("At least 2 characters");
          }
        }}
      />
      <Form.Dropdown id="meal" title="Meal" defaultValue={getDefaultMeal()}>
        {MEALS.map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={`${MEAL_ICONS[m]} ${formatMealType(m)}`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function FoodConfirmation({ result, meal }: { result: AIFoodAnalysisResult; meal: MealType }) {
  const [isLogging, setIsLogging] = useState(false);
  const { food, quantity: suggestedQuantity, confidence, warnings, foodKey } = result;
  const serving = getDefaultServing(food);
  const quantity = suggestedQuantity ?? 1;

  const n = food.nutrition;
  const multiplier = serving.multiplier * quantity;
  const cals = Math.round(n.calories * multiplier);
  const protein = Math.round(n.protein * multiplier * 10) / 10;
  const carbs = Math.round(n.carbs * multiplier * 10) / 10;
  const fat = Math.round(n.fat * multiplier * 10) / 10;

  const confidenceIcon = confidence === "high" ? "🟢" : confidence === "medium" ? "🟡" : "🔴";
  const warningLines = warnings?.length ? warnings.map((w) => `> ⚠️ ${w}`).join("\n") : "";

  const markdown = `# ${food.name}${food.brand ? ` — ${food.brand}` : ""}

${warningLines}

| Nutrient | Amount |
|----------|--------|
| Calories | **${cals} kcal** |
| Protein | ${protein}g |
| Carbs | ${carbs}g |
| Fat | ${fat}g |
${n.fiber != null ? `| Fiber | ${Math.round(n.fiber * multiplier * 10) / 10}g |` : ""}
${n.sugar != null ? `| Sugar | ${Math.round(n.sugar * multiplier * 10) / 10}g |` : ""}

**Serving:** ${formatServingWithQuantity(serving, quantity)}
**Meal:** ${MEAL_ICONS[meal]} ${formatMealType(meal)}
**Confidence:** ${confidenceIcon} ${confidence}`;

  async function handleLog() {
    setIsLogging(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging to diary..." });

    try {
      await createDiaryFromSnapshot({
        food,
        foodKey,
        servingId: serving.id,
        quantity,
        meal,
        loggedAt: new Date().toISOString(),
      });
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${food.name}`;
      toast.message = `${cals} kcal`;
      await popToRoot();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Log";
      toast.message = err instanceof Error ? err.message : "Unknown error";
      setIsLogging(false);
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLogging}
      actions={
        <ActionPanel>
          <Action title="Log to Diary" onAction={handleLog} />
          <Action title="Cancel" onAction={popToRoot} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    />
  );
}
