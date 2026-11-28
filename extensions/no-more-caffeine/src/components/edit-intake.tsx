import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import type { CaffeineIntake } from "../types";
import { parseIntakeFromForm } from "../utils/intakeValidation";
import { updateIntake } from "../utils/storage";

interface EditFormValues {
  drinkType: string;
  caffeineAmount: string;
  amountDescription: string;
  intakeTime: Date | null;
}

export function EditIntakeForm({ intake, onSave }: { intake: CaffeineIntake; onSave: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: EditFormValues) {
    const parsed = parseIntakeFromForm(values.caffeineAmount, values.intakeTime, intake.timestamp);
    if (!parsed) {
      return;
    }

    const { caffeineMg, chosenTime } = parsed;

    try {
      await updateIntake({
        ...intake,
        timestamp: chosenTime,
        amount: caffeineMg,
        drinkType: values.drinkType || intake.drinkType,
        amountDescription: values.amountDescription || undefined,
      });
      onSave();
      pop();
      showToast({ style: Toast.Style.Success, title: "Updated", message: "Intake record updated" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Error", message: "Failed to update intake" });
    }
  }

  return (
    <Form
      navigationTitle="Edit Intake"
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Changes" icon={Icon.Checkmark} />
        </ActionPanel>
      }
    >
      <Form.TextField id="drinkType" title="Drink Type" defaultValue={intake.drinkType} placeholder="Coffee" />
      <Form.DatePicker
        id="intakeTime"
        title="Time"
        type={Form.DatePicker.Type.DateTime}
        defaultValue={intake.timestamp}
      />
      <Form.TextField
        id="amountDescription"
        title="Amount (Optional)"
        defaultValue={intake.amountDescription ?? ""}
        placeholder="e.g., 1 cup, 200ml"
      />
      <Form.TextField
        id="caffeineAmount"
        title="Caffeine Amount (mg)"
        defaultValue={String(intake.amount)}
        placeholder="Enter caffeine amount in milligrams"
      />
    </Form>
  );
}
