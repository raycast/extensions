import { useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import { expandTilde } from "./utils";
import { ReadingFields, useActiveUrlAutofill, validateUrl } from "./components";

interface Preferences {
  inboxPath: string;
}

interface CaptureLine {
  url: string;
  capturedAt: string;
  thoughts?: string;
  rating?: number;
}

interface FormValues {
  url: string;
  thoughts: string;
  rating: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(false);

  const { handleSubmit, itemProps, reset, setValue } = useForm<FormValues>({
    initialValues: {
      url: "",
      thoughts: "",
      rating: "",
    },
    onSubmit: async (values) => {
      setIsLoading(true);
      try {
        // ISO-8601 UTC timestamp, seconds precision (e.g. 2026-06-22T10:30:00Z)
        const capturedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

        const entry: CaptureLine = {
          url: values.url,
          capturedAt,
        };
        const thoughts = values.thoughts.trim();
        if (thoughts) entry.thoughts = thoughts;
        if (values.rating) entry.rating = parseInt(values.rating, 10);

        const inboxPath = expandTilde(
          preferences.inboxPath || "~/rlog/inbox.jsonl",
        );
        fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
        fs.appendFileSync(inboxPath, JSON.stringify(entry) + "\n");

        await showToast({
          style: Toast.Style.Success,
          title: "Captured",
          message: entry.url,
        });

        reset({ url: "", thoughts: "", rating: "" });
      } catch (error) {
        await showFailureToast(error, { title: "Failed to capture" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: { url: validateUrl },
  });

  useActiveUrlAutofill(setValue);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <ReadingFields
        url={itemProps.url}
        thoughts={itemProps.thoughts}
        rating={itemProps.rating}
      />
    </Form>
  );
}
