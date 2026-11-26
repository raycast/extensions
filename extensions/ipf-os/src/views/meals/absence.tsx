import { Action, ActionPanel, Form, Icon, confirmAlert, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getAbsences, notifyAbsence } from "../../lib/api/meals";
import { absenceIsLate, eatToday, eatTime, validAbsenceDate } from "../../lib/meals/planning";
import { mealAction } from "./common";

async function loadExistingAbsence(_account: string, date: string) {
  return getAbsences(date, date);
}

export function MealAbsenceForm({ account, date, onSaved }: { account: string; date?: string; onSaved: () => void }) {
  const { pop } = useNavigation();
  const [chosenDate, setChosenDate] = useState(date ?? eatToday());
  const [error, setError] = useState<string>();
  const [reasonError, setReasonError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const existing = useCachedPromise(loadExistingAbsence, [account, chosenDate], {
    execute: validAbsenceDate(chosenDate),
    keepPreviousData: false,
  });
  const notice = existing.data?.[0];
  async function submit(values: { reason: string }) {
    if (busy) return;
    if (!validAbsenceDate(chosenDate)) {
      setError("Use a valid date today or later, in YYYY-MM-DD format.");
      return;
    }
    if (values.reason.trim().length > 300) {
      setReasonError("Keep the reason within 300 characters.");
      return;
    }
    const confirmed = await confirmAlert({
      title: `Notify absence for ${chosenDate}?`,
      message: `${absenceIsLate(chosenDate) ? "This is a late notice: the deadline was 08:00 EAT. " : ""}This records a notice for Meals staff. It does not cancel a locked order or reverse a charge. Notices cannot be edited or withdrawn here.`,
      primaryAction: { title: "Notify Absence" },
    });
    if (!confirmed) return;
    setBusy(true);
    const ok = await mealAction(
      "Recording absence…",
      (notice) => (notice.onTime ? "Absence recorded on time" : "Absence recorded late"),
      async () => {
        const existing = await getAbsences(chosenDate, chosenDate);
        if (existing.length)
          throw new Error(
            `A notice already exists, recorded ${eatTime(existing[0].notifiedAt)}. It has not been replaced.`,
          );
        return notifyAbsence(chosenDate, values.reason.trim());
      },
      onSaved,
    );
    if (!ok) existing.revalidate();
    setBusy(false);
    if (ok) pop();
  }
  return (
    <Form
      navigationTitle="Notify Meal Absence"
      isLoading={busy || existing.isLoading}
      actions={
        <ActionPanel>
          {!notice && <Action.SubmitForm title="Notify Absence" icon={Icon.Calendar} onSubmit={submit} />}
          {existing.error && (
            <Action title="Check Existing Notice" icon={Icon.ArrowClockwise} onAction={existing.revalidate} />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="date"
        title="Service Date (EAT)"
        value={chosenDate}
        onChange={(value) => {
          setChosenDate(value);
          setError(undefined);
        }}
        error={error}
        placeholder="YYYY-MM-DD"
      />
      {notice && (
        <Form.Description
          title="Existing Notice"
          text={`Recorded ${eatTime(notice.notifiedAt)} · ${notice.onTime ? "On time" : "Late"}${notice.reason ? ` · ${notice.reason}` : ""}. This notice cannot be edited or withdrawn here.`}
        />
      )}
      {existing.error && (
        <Form.Description
          title="Could Not Check Notices"
          text={`${existing.error.message}. Existing notices will be checked again before saving.`}
        />
      )}
      {!notice && (
        <Form.TextArea
          id="reason"
          title="Reason"
          error={reasonError}
          onChange={() => setReasonError(undefined)}
          placeholder="Optional · up to 300 characters"
        />
      )}
      <Form.Description
        title="Notice Deadline"
        text="A notice is on time only when received before 08:00 EAT on the service date."
      />
      {validAbsenceDate(chosenDate) && absenceIsLate(chosenDate) && (
        <Form.Description title="Late Notice" text="This notice will be late. Meals staff will still receive it." />
      )}
      <Form.Description
        title="What This Does"
        text="Records an absence notice. It does not promise cancellation of an order or reversal of charges."
      />
    </Form>
  );
}
