import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  LaunchProps,
  popToRoot,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { addFavorite, analyzeText, createDiaryFromSnapshot } from "./api";
import type { AnalyzeTextResponse, MealType, NutritionSource } from "./types";
import {
  formatMealType,
  formatServingWithQuantity,
  getDefaultMeal,
  getDefaultServing,
  MEAL_ICONS,
  MEALS,
  mealColor,
  scaleNutrition,
} from "./utils";

const QUANTITIES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

const SOURCE_LABELS: Record<NutritionSource, string> = {
  database: "Nutrition database",
  ai_estimated: "AI estimate",
  label_extracted: "Label",
};

export default function LogFood(props: LaunchProps<{ arguments: Arguments.LogFood }>) {
  // launchCommand (e.g. from the menu bar) may not pass an arguments object.
  const initialDescription = props.arguments?.description?.trim();

  // Launched from root search with an argument — skip the form entirely.
  if (initialDescription) {
    return <FoodConfirmation description={initialDescription} meal={getDefaultMeal()} />;
  }

  return <LogFoodForm />;
}

function LogFoodForm() {
  const { push } = useNavigation();
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  function handleSubmit(values: { description: string; meal: MealType }) {
    const description = values.description.trim();
    if (!description) {
      setDescriptionError("Description is required");
      return;
    }
    if (description.length < 2) {
      setDescriptionError("At least 2 characters");
      return;
    }
    push(<FoodConfirmation description={description} meal={values.meal} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Analyze Food" icon={Icon.Wand} onSubmit={handleSubmit} />
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

function FoodConfirmation({ description, meal: initialMeal }: { description: string; meal: MealType }) {
  const [analysis, setAnalysis] = useState<AnalyzeTextResponse | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const [meal, setMeal] = useState<MealType>(initialMeal);
  const [quantity, setQuantity] = useState<number | undefined>();
  const [servingId, setServingId] = useState<string | undefined>();
  const [isLogging, setIsLogging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    analyzeText(description)
      .then((response) => {
        if (cancelled) return;
        setAnalysis(response);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [description, attempt]);

  if (error) {
    return (
      <Detail
        markdown={`# Analysis Failed\n\n> ${error}\n\n**Description:** ${description}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => setAttempt((a) => a + 1)} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !analysis) {
    return <Detail isLoading markdown={`# Analyzing...\n\n_${description}_`} />;
  }

  const { result, tokenBalance } = analysis;
  const { food, confidence, warnings, foodKey, analysisId, nutritionSource, requiresConfirmation } = result;

  const serving = food.servings.find((s) => s.id === servingId) ?? getDefaultServing(food);
  const qty = quantity ?? result.quantity ?? 1;
  const scaled = scaleNutrition(food.nutrition, serving, qty);

  const callouts = [
    ...(requiresConfirmation
      ? ["> ⚠️ **Review this estimate** — unusually high calories or an uncertain analysis."]
      : []),
    ...(warnings ?? []).map((w) => `> ⚠️ ${w}`),
  ].join("\n>\n");

  const markdown = `# ${food.name}${food.brand ? ` — ${food.brand}` : ""}\n\n${callouts}`;

  const confidenceColor = confidence === "high" ? Color.Green : confidence === "medium" ? Color.Yellow : Color.Red;

  async function handleLog(alsoFavorite: boolean) {
    setIsLogging(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Logging to diary..." });

    try {
      await createDiaryFromSnapshot({
        food,
        foodKey,
        servingId: serving.id,
        quantity: qty,
        meal,
        loggedAt: new Date().toISOString(),
        aiAnalysisId: analysisId,
      });
      if (alsoFavorite) {
        try {
          await addFavorite(food);
        } catch (err) {
          toast.style = Toast.Style.Failure;
          toast.title = "Logged, Favorite Failed";
          toast.message = err instanceof Error ? err.message : "Unknown error";
          await popToRoot();
          return;
        }
      }
      toast.style = Toast.Style.Success;
      toast.title = `Logged ${food.name}`;
      toast.message = `${scaled.calories} kcal${alsoFavorite ? " · added to favorites" : ""}`;
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
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Calories" text={`${scaled.calories} kcal`} />
          <Detail.Metadata.Label title="Protein" text={`${scaled.protein} g`} />
          <Detail.Metadata.Label title="Carbs" text={`${scaled.carbs} g`} />
          <Detail.Metadata.Label title="Fat" text={`${scaled.fat} g`} />
          {scaled.fiber != null && <Detail.Metadata.Label title="Fiber" text={`${scaled.fiber} g`} />}
          {scaled.sugar != null && <Detail.Metadata.Label title="Sugar" text={`${scaled.sugar} g`} />}
          {scaled.sodium != null && <Detail.Metadata.Label title="Sodium" text={`${scaled.sodium} mg`} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Serving" text={formatServingWithQuantity(serving, qty)} />
          <Detail.Metadata.TagList title="Meal">
            <Detail.Metadata.TagList.Item
              text={`${MEAL_ICONS[meal]} ${formatMealType(meal)}`}
              color={mealColor(meal)}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Confidence">
            <Detail.Metadata.TagList.Item text={confidence} color={confidenceColor} />
          </Detail.Metadata.TagList>
          {nutritionSource && <Detail.Metadata.Label title="Source" text={SOURCE_LABELS[nutritionSource]} />}
          {tokenBalance && (
            <Detail.Metadata.Label
              title="AI Tokens"
              text={`${Math.round(tokenBalance.used / 1000)}k / ${Math.round(tokenBalance.limit / 1000)}k`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Log to Diary" icon={Icon.Checkmark} onAction={() => handleLog(false)} />
          <Action
            title="Log and Add to Favorites"
            icon={Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => handleLog(true)}
          />
          <ActionPanel.Submenu title="Change Quantity" icon={Icon.Hashtag} shortcut={{ modifiers: ["cmd"], key: "u" }}>
            {QUANTITIES.map((q) => (
              <Action key={q} title={`${q} ×${q === qty ? "  ✓" : ""}`} onAction={() => setQuantity(q)} />
            ))}
          </ActionPanel.Submenu>
          {food.servings.length > 1 && (
            <ActionPanel.Submenu title="Change Serving" icon={Icon.Ruler} shortcut={{ modifiers: ["cmd"], key: "s" }}>
              {food.servings.map((s) => (
                <Action
                  key={s.id}
                  title={`${s.description}${s.id === serving.id ? "  ✓" : ""}`}
                  onAction={() => setServingId(s.id)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Submenu title="Change Meal" icon={Icon.Calendar} shortcut={{ modifiers: ["cmd"], key: "m" }}>
            {MEALS.map((m) => (
              <Action
                key={m}
                title={`${MEAL_ICONS[m]} ${formatMealType(m)}${m === meal ? "  ✓" : ""}`}
                onAction={() => setMeal(m)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            onAction={popToRoot}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
