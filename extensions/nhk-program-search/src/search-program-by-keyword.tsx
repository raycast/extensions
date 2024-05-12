import { Action, ActionPanel, Form } from "@raycast/api";
import React, { useState } from "react";
import { ProgramList } from "./components/ProgramList";

export default function Command() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (submitted) {
    return <ProgramList customFilters={[(p) => keywords.some((w) => p.title.includes(w))]} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Programs" onSubmit={() => setSubmitted(true)} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          "Displays programs that include the specified keywords in the program title. \nMultiple keywords can be specified with line breaks."
        }
      />
      <Form.TextArea
        id="keywords"
        title="Keywords"
        onChange={(newValue) => {
          setKeywords(newValue.split("\n"));
        }}
        storeValue
      />
    </Form>
  );
}
