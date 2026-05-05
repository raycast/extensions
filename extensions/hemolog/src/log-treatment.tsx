import { useState } from "react";
import { format } from "date-fns";
import { Action, Toast, showToast, getPreferenceValues, Form, ActionPanel, popToRoot } from "@raycast/api";
import type { Treatment } from "./recent-treatments";

export default function LogTreatments() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Treatment" onSubmit={(input: Treatment) => logTreatment(input, setIsLoading)} />
          <Action.OpenInBrowser title="Visit Hemolog" url="https://hemolog.com/home" />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type of treatment" defaultValue="ANTIBODY">
        <Form.Dropdown.Item value="ANTIBODY" title="Antibody" icon="⚫" />
        <Form.Dropdown.Item value="PROPHY" title="Prophy" icon="🔵" />
        <Form.Dropdown.Item value="BLEED" title="Bleed" icon="🔴" />
        <Form.Dropdown.Item value="PREVENTATIVE" title="Preventative" icon="🟢" />
      </Form.Dropdown>
      <Form.DatePicker id="date" title="Date of treatment" defaultValue={adjustDateForTimezone(new Date())} />
      <Form.TextField id="sites" title="Affected areas" placeholder="Left ankle, right knee" />
      <Form.TextField id="cause" title="Cause" placeholder="Ran into a door 🤦" />
    </Form>
  );
}

async function logTreatment(values: Form.Values, setIsLoading: (isLoading: boolean) => void) {
  const preferences = getPreferenceValues();
  const { API_KEY } = preferences;
  setIsLoading(true);

  if (!values.date || !values.type) {
    showToast(Toast.Style.Failure, "Treatment type and date are required");
    setIsLoading(false);
    return;
  }

  try {
    const body = {
      ...values,
      date: format(adjustDateForTimezone(values.date), "yyyy-MM-dd"),
    };
    await fetch(`https://hemolog.com/api/log-treatment?apikey=${API_KEY}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
    showToast(Toast.Style.Success, "Treatment logged!");
    setIsLoading(false);
    popToRoot();
    return;
  } catch (error) {
    if (error) {
      setIsLoading(false);
      showToast(Toast.Style.Failure, "Could not submit Treatment");
    }
    return;
  }
}

const adjustDateForTimezone = (date: Date) => {
  const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
  return adjustedDate;
};
