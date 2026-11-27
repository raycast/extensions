import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useForm, showFailureToast } from "@raycast/utils";
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
  const [busy, setBusy] = useState(false);
  const [sideCleared, setSideCleared] = useState(false);
  const { values, itemProps, handleSubmit, setValue, setValidationError } = useForm<{ main: string; side: string }>({
    initialValues: { main: choice.mainId ?? "", side: choice.sideId ?? "" },
    validation: {
      main: (value) => {
        if (!value) return "Choose a main meal or explicitly skip this day.";
        return choiceIssue({ day: choice.day, state: "selected", mainId: value, sideId: null }, options, rules);
      },
      side: (value): string | null | undefined => {
        if (!values.main) return;
        return choiceIssue(
          { day: choice.day, state: "selected", mainId: values.main, sideId: value || null },
          options,
          rules,
        );
      },
    },
    onSubmit: ({ main, side }) => apply({ day: choice.day, state: "selected", mainId: main, sideId: side || null }),
  });
  const mainId = values.main;
  const sideId = values.side;
  const mains = options.filter((item) => item.day === choice.day && item.role === "main");
  const main = mains.find((item) => item.id === mainId);
  const sides = compatibleSides(choice.day, mainId, options, rules);
  const apply = async (next: DayChoice) => {
    if (busy) return;
    setBusy(true);
    try {
      await onApply(next);
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not keep this meal choice" });
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
            <Action.SubmitForm title="Apply to Draft" icon={Icon.Checkmark} onSubmit={handleSubmit} />
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
          {...itemProps.main}
          title="Main"
          storeValue={false}
          onChange={(value) => {
            itemProps.main.onChange?.(value);
            if (sideId && !compatibleSides(choice.day, value, options, rules).some((item) => item.id === sideId)) {
              setValue("side", "");
              setValidationError("side", undefined);
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
            {...itemProps.side}
            title="Side"
            onChange={(value) => {
              itemProps.side.onChange?.(value);
              setSideCleared(false);
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
