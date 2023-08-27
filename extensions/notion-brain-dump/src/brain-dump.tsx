import { Action, ActionPanel, Form, OAuth } from "@raycast/api";
import { useState } from "react";
import SelectPage from "./components/SelectPage";

type BrainDumpProps = {};
const BrainDump: React.FC<BrainDumpProps> = (props) => {
  const [dump, setDump] = useState("");

  return (
    <>
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Submit dump" onSubmit={(values) => console.log(values)} />
            <Action.Push title="Select page" target={<SelectPage />} />

          </ActionPanel>
        }
      >
        <Form.TextField
          id="dump"
          title="Dump"
          value={dump}
          onChange={(val) => setDump(val)}
          placeholder="Enter your thoughts here..."
        />
      </Form>
    </>
  );
};

export default BrainDump;
