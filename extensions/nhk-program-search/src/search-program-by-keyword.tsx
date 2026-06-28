import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { ProgramList } from "./components/ProgramList";

export default function Command() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Programs"
            onSubmit={() => {
              push(<ProgramList customFilters={[(p) => keywords.some((w) => p.title.includes(w))]} canSelectAll />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          "Displays programs that include the specified keywords in the program title. Multiple keywords can be specified with line breaks."
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
