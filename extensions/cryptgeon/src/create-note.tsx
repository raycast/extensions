import "./fetch.js";

import { Action, ActionPanel, Form, getPreferenceValues, Icon } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { API, Status } from "cryptgeon";
import prettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";
import { Duration } from "uhrwerk";
import { createNote } from "./shared.js";

enum NoteType {
  Text = "text",
  File = "file",
}

enum NoteLimit {
  Views = "views",
  Time = "expiration",
}

type CreateNotePayload = {
  content: string;
  files: string[];
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
  const [type, setType] = useState(NoteType.Text);
  const [limit, setLimit] = useState(NoteLimit.Views);
  const [status, setStatus] = useState<Status | null>(null);

  const expirationHuman = status ? new Duration(status.max_expiration, "minutes").humanize() : "...";

  const { handleSubmit, itemProps } = useForm<CreateNotePayload>({
    initialValues: { views: "1" },
    async onSubmit(values) {
      await createNote(values.content ?? values.files, {
        views: values.views ? Number.parseInt(values.views) : undefined,
        expiration: values.expiration ? getRelativeMinutes(values.expiration) : undefined,
      });
    },
    validation: {
      files: (value) => {
        if (type === NoteType.File && (!value || value.length === 0)) return FormValidation.Required;
      },
      content: (value) => {
        if (type === NoteType.Text && !value) return FormValidation.Required;
      },
      views: (value) => {
        if (limit === NoteLimit.Time) return;
        if (!value) return FormValidation.Required;
        const parsed = Number.parseInt(value);
        if (Number.isNaN(parsed)) return "Must be a number";
        if (parsed < 1) return "Must be greater than 0";
      },
      expiration: (value) => {
        if (limit === NoteLimit.Views) return;
        if (!(value instanceof Date)) return FormValidation.Required;
        const minutes = getRelativeMinutes(value);
        if (minutes < 1) return "Must be in the future";
        if (status && status.max_expiration < minutes) return `Must be less than ${expirationHuman}`;
      },
    },
  });

  useEffect(() => {
    API.setOptions({ server: preferences.server });
    API.status().then(setStatus);
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="type" title="Type" value={type} onChange={(value) => setType(value as NoteType)}>
        <Form.Dropdown.Item value={NoteType.Text} title="Text" icon={Icon.Text} />
        <Form.Dropdown.Item value={NoteType.File} title="File" icon={Icon.Document} />
      </Form.Dropdown>
      {type === NoteType.Text ? (
        <Form.TextArea {...itemProps.content} title="Content" />
      ) : (
        <Form.FilePicker {...itemProps.files} />
      )}

      <Form.Separator />

      <Form.Dropdown id="limit" title="Limit by" value={limit} onChange={(limit) => setLimit(limit as NoteLimit)}>
        <Form.Dropdown.Item value={NoteLimit.Views} title="Views" icon={Icon.Eye} />
        <Form.Dropdown.Item value={NoteLimit.Time} title="Time" icon={Icon.Calendar} />
      </Form.Dropdown>
      {limit === NoteLimit.Views ? (
        <Form.TextField {...itemProps.views} />
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
