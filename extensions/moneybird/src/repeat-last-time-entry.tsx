import { Form, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import RecordHoursForm from "./record-hours-form";
import { provider } from "./oauth/client";
import { loadLastTimeEntry, toFormInitialValues, LastTimeEntryFormValues } from "./lib/last-time-entry";

function RepeatLastTimeEntry() {
  const [initialValues, setInitialValues] = useState<LastTimeEntryFormValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadLastEntry() {
      const lastEntry = await loadLastTimeEntry();
      if (!lastEntry) {
        showToast({ style: Toast.Style.Failure, title: "No previous time entry found" });
        setInitialValues(null);
      } else {
        setInitialValues(toFormInitialValues(lastEntry));
      }
      setIsLoading(false);
    }

    loadLastEntry();
  }, []);

  if (isLoading) {
    return <Form isLoading />;
  }

  return <RecordHoursForm initialValues={initialValues ?? undefined} useStartTime={false} />;
}

export default withAccessToken(provider)(RepeatLastTimeEntry);
