import "./fetch.js";

import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
// @ts-expect-error types for this package are not exported correctly atm
import { status as getStatus, setOptions, Status } from "cryptgeon";
import prettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";
import { Duration } from "uhrwerk";
import { createNote } from "./shared.js";

type CreateNotePayload = {
  type: string;
  content: string;
  files: string[];
  limit: string;
  views: string;
  expiration: Date | null;
};

function getRelativeMinutes(date: Date): number {
  const now = Date.now();
  const diff = date.valueOf() - now;
  return Math.ceil(diff / 1000 / 60);
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [status, setStatus] = useState<Status | null>(null);

  const expirationHuman = status ? new Duration(status.max_expiration, "minutes").humanize() : "...";

  const { handleSubmit, itemProps, values } = useForm<CreateNotePayload>({
    async onSubmit(values) {
      await createNote(values.content ?? values.files, {
        views: values.views ? Number.parseInt(values.views) : undefined,
        expiration: values.expiration ? getRelativeMinutes(values.expiration) : undefined,
      });
    },
    validation: {
      views: (value) => {
        if (!value) return;
        const parsed = Number.parseInt(value);
        if (Number.isNaN(parsed)) return "Must be a number";
        if (parsed < 1) return "Must be greater than 0";
      },
      expiration: (value) => {
        if (!value) return;
        const minutes = getRelativeMinutes(value);
        if (minutes < 1) return "Must be in the future";
        if (status && status.max_expiration < minutes) return `Must be less than ${expirationHuman}`;
      },
    },
  });

  useEffect(() => {
    setOptions({ server: preferences.server });
    getStatus().then(setStatus);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" defaultValue="text" {...itemProps.type}>
        <Form.Dropdown.Item value="text" title="Text" icon={Icon.Text} />
        <Form.Dropdown.Item value="file" title="File" icon={Icon.Document} />
      </Form.Dropdown>
      {values.type === "text" ? (
        <Form.TextArea {...itemProps.content} title="Content" />
      ) : (
        <Form.FilePicker {...itemProps.files} />
      )}

      <Form.Separator />

      <Form.Dropdown {...itemProps.limit} title="Limit by" defaultValue="view">
        <Form.Dropdown.Item value="views" title="Views" icon={Icon.Eye} />
        <Form.Dropdown.Item value="time" title="Time" icon={Icon.Calendar} />
      </Form.Dropdown>
      {values.limit === "views" ? (
        <Form.TextField {...itemProps.views} defaultValue="1" />
      ) : (
        <Form.DatePicker {...itemProps.expiration} title="Expiration" />
      )}

      <Form.Separator />

      <Form.Description title="Server" text={status ? `${status.version} － ${preferences.server}` : "..."} />
      <Form.Description
        title="Limits"
        text={
          status
            ? `Views: ${status.max_views}   Expiration: ${expirationHuman}   Size: ${prettyBytes(status.max_size)}`
            : "..."
        }
      />
    </Form>
  );
}
