import { Form, Icon } from "@raycast/api";
import { Entry, EntryCutPaste, EntryDirectReplace } from "../types";
import { useState } from "react";
import FormDirectReplace from "./FormDirectReplace";
import FormCutPaste from "./FormCutPaste";

const ReplacementTypeDropdown = (type: string, onChange: (value: Entry["type"]) => void) => {
  return (
    <Form.Dropdown id="type" title="Type" defaultValue={type} onChange={(value) => onChange(value as Entry["type"])}>
      <Form.Dropdown.Item value="directReplace" title="Direct Replace" icon={Icon.Bolt} />
      <Form.Dropdown.Item value="cutPaste" title="Cut Paste" icon={Icon.Code} />
    </Form.Dropdown>
  );
};

export interface EntryFormProps {
  initialValues: Entry;
  isNew?: boolean;
}

export default function EntryForm({ initialValues, isNew }: EntryFormProps) {
  const [type, setType] = useState<Entry["type"]>(initialValues?.type || "directReplace");

  return type === "directReplace" ? (
    <FormDirectReplace initialValues={initialValues as EntryDirectReplace} isNew={isNew}>
      {ReplacementTypeDropdown(type, setType)}
    </FormDirectReplace>
  ) : (
    <FormCutPaste initialValues={initialValues as EntryCutPaste} isNew={isNew}>
      {ReplacementTypeDropdown(type, setType)}
    </FormCutPaste>
  );
}
