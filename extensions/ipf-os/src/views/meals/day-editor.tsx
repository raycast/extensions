import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { choiceIssue, compatibleSides, WEEKDAYS } from "../../lib/meals/planning";
import type { CompatibilityRule, DayChoice, MenuOption } from "../../lib/meals/schemas";

export function MealDayEditor({
  choice,
  options,
  rules,
  onApply,
}: {
  choice: DayChoice;
  options: MenuOption[];
  rules: CompatibilityRule[];
  onApply: (choice: DayChoice) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [mainId, setMainId] = useState(choice.mainId ?? "");
  const [sideId, setSideId] = useState(choice.sideId ?? "");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sideCleared, setSideCleared] = useState(false);
  const mains = options.filter((item) => item.day === choice.day && item.role === "main");
  const main = mains.find((item) => item.id === mainId);
  const sides = compatibleSides(choice.day, mainId, options, rules);
  const apply = async (next: DayChoice) => {
    if (busy) return;
    const issue = choiceIssue(next, options, rules);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      await onApply(next);
      pop();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not keep this choice");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Form
      navigationTitle={`${WEEKDAYS[choice.day - 1]} · Meal choice`}
      isLoading={busy}
      actions={
        <ActionPanel>
          {mains.length > 0 && (
            <Action.SubmitForm
              title="Apply to Draft"
              icon={Icon.Checkmark}
              onSubmit={() =>
                apply({ day: choice.day, state: "selected", mainId, sideId: main?.special ? null : sideId || null })
              }
            />
          )}
          <Action
            title="Skip This Day"
            icon={Icon.MinusCircle}
            onAction={() => apply({ day: choice.day, state: "skipped", mainId: null, sideId: null })}
          />
        </ActionPanel>
      }
    >
      {mains.length ? (
        <Form.Dropdown
          id="main"
          title="Main"
          value={mainId}
          storeValue={false}
          error={error}
          onChange={(value) => {
            setMainId(value);
            setError(undefined);
            if (sideId && !compatibleSides(choice.day, value, options, rules).some((item) => item.id === sideId)) {
              setSideId("");
              setSideCleared(true);
            }
          }}
        >
          <Form.Dropdown.Item value="" title="Choose a main" />
          {mains.map((item) => (
            <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description title="Menu" text="No main meals are available for this day. You can explicitly skip it." />
      )}
      {main?.description && <Form.Description title="About" text={main.description} />}
      {main?.note && <Form.Description title="Menu Note" text={main.note} />}
      {main?.special ? (
        <Form.Description title="Complete Dish" text="This meal is served on its own, without a side." />
      ) : (
        main && (
          <Form.Dropdown
            id="side"
            title="Side"
            value={sideId}
            onChange={(value) => {
              setSideId(value);
              setSideCleared(false);
              setError(undefined);
            }}
            storeValue={false}
          >
            <Form.Dropdown.Item value="" title="No Side" />
            {sides.map((item) => (
              <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} />
            ))}
          </Form.Dropdown>
        )
      )}
      {sideCleared && (
        <Form.Description
          title="Side Updated"
          text={
            main?.special
              ? "The previous side was removed because this is a complete dish."
              : "The previous side does not match this main. Choose another side or leave No Side."
          }
        />
      )}
      <Form.Description
        title="Draft Only"
        text="Apply keeps this day in your draft. Submit the full week from Review Plan when you are ready."
      />
    </Form>
  );
}
