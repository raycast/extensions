import { Form } from "@raycast/api";
import { useState } from "react";

export const SelectAttachments = (props: { setAttachments?: (attachments: string[]) => void }): JSX.Element => {
  const [numAttachments, setNumAttachments] = useState<number>(0);
  const [addButton, setAddButton] = useState<boolean>(false);

  const attachmentsArray: number[] = Array.from({ length: numAttachments }, (_, i) => i);

  return (
    <Form>
      {attachmentsArray.map((i: number) => (
        <Form.Dropdown key={i} id={i.toString()} title=""></Form.Dropdown>
      ))}
      <Form.Checkbox
        label="Add Attachment"
        id="add-attachments"
        value={addButton}
        onChange={() => {
          setAddButton(false);
          setNumAttachments(numAttachments + 1);
        }}
      />
    </Form>
  );
};
