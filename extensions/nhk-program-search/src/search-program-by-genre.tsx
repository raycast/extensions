import { Action, ActionPanel, Form } from "@raycast/api";
import React, { useState } from "react";
import { ProgramList } from "./components/ProgramList";
import { genreLabels } from "./types";

export default function Command() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (submitted) {
    return <ProgramList customFilters={[(p) => p.genres.some((g) => selectedGenres.includes(g))]} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Programs"
            onSubmit={async (input) => {
              setSelectedGenres(input.genres);
              setSubmitted(true);
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
