import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import React from "react";
import { ProgramList } from "./components/ProgramList";
import { genreLabels } from "./types";

export default function Command() {
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Programs"
            onSubmit={async (input) => {
              push(<ProgramList customFilters={[(p) => p.genres.some((g) => input.genres.includes(g))]} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="genres" title="Genres" defaultValue={[]} storeValue>
        {Array.from(genreLabels).map(([key, label]) => (
          <Form.TagPicker.Item key={key} value={key} title={label} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
