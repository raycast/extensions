import React, { useState } from "react";
import { Form, ActionPanel, Action } from "@raycast/api";
import { SourceDetail } from "./lib/components/SourceDetail";

/**
 * Form values interface
 */
interface FormValues {
  reference: string;
}

/**
 * Main get source command component
 */
export default function GetSourceCommand() {
  const [reference, setReference] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");

  const handleSubmit = (values: FormValues) => {
    setSubmittedReference(values.reference);
  };

  const handleBackToForm = () => {
    setSubmittedReference("");
  };

  if (submittedReference) {
    return <SourceDetail reference={submittedReference} onBack={handleBackToForm} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Get Source" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="reference"
        title="Reference"
        placeholder="e.g., Exod. 17:15, Exodus 17:15, Shemot 17:15, Berakhot 14b, Rashi on Genesis 1:1"
        value={reference}
        onChange={setReference}
        info="Enter a biblical reference, Talmudic reference, or commentary reference"
      />
    </Form>
  );
}
