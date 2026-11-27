import { Alert, Action, ActionPanel, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { getNextMealSelection, setMealAvailability, setMealReminders } from "../../lib/api/meals";
import { addDays, currentMonday, weekLabel } from "../../lib/meals/planning";
import type { MealsProfile } from "../../lib/meals/schemas";
import { showFailureToast } from "@raycast/utils";

export function MealPreferences({ profile, onSaved }: { profile: MealsProfile; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [savedProfile, setSavedProfile] = useState(profile);
  const [available, setAvailable] = useState(profile.isAvailableNextWeek);
  const [reminders, setReminders] = useState(profile.reminders);
  const [busy, setBusy] = useState(false);
  const week = addDays(currentMonday(), 7);
  async function save() {
    if (busy) return;
    setBusy(true);
    let availabilitySaved = false;
    try {
      const availabilityChanged = available !== savedProfile.isAvailableNextWeek;
      const remindersChanged = reminders !== savedProfile.reminders;
      let deleteSubmission = false;
      if (availabilityChanged && !available) {
        const selection = await getNextMealSelection();
        if (selection) {
          deleteSubmission = await confirmAlert({
            title: `Unavailable for ${weekLabel(week)}?`,
            message:
              "This cancels your existing meal submission for next week. Becoming available again will not restore it.",
            primaryAction: { title: "Cancel Plan and Mark Unavailable", style: Alert.ActionStyle.Destructive },
          });
          if (!deleteSubmission) return;
        }
      }
      if (availabilityChanged) {
        const result = await setMealAvailability(available, week, deleteSubmission);
        if ("requiresConfirmation" in result)
          throw new Error("A saved plan now exists. Review it and confirm cancellation before changing availability.");
        setSavedProfile(result.user);
        availabilitySaved = true;
        onSaved();
      }
      if (remindersChanged) {
        const result = await setMealReminders(reminders);
        setSavedProfile(result.user);
        onSaved();
      }
      await showToast({ style: Toast.Style.Success, title: "Meal preferences saved" });
      pop();
    } catch (error) {
      await showFailureToast(error, {
        title: availabilitySaved ? "Availability saved; reminders not confirmed" : "Preferences were not confirmed",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      navigationTitle="Meal Preferences"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Preferences" icon={Icon.Checkmark} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.Description title="Next Week" text={weekLabel(week)} />
      <Form.Checkbox
        id="available"
        title="Availability"
        label="I will be available for meals next week"
        value={available}
        onChange={setAvailable}
      />
      <Form.Description
        title="Availability"
        text="Turning this off can cancel an existing next-week submission. You will be asked before it is canceled."
      />
      <Form.Separator />
      <Form.Checkbox
        id="reminders"
        title="Meals Reminders"
        label="Remind me to choose next week's meals"
        value={reminders}
        onChange={setReminders}
      />
      <Form.Description
        title="Delivery"
        text="The current weekly reminder service sends email. Existing delivery-channel settings are preserved."
      />
    </Form>
  );
}
