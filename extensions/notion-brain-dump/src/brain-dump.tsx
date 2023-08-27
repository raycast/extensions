import { Action, ActionPanel, Form, OAuth } from "@raycast/api";
import { useState } from "react";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Notion",
  providerIcon: "notion-logo.png",
  description: "Connect your Notion account…",
});

type BrainDumpProps = {};
const BrainDump: React.FC<BrainDumpProps> = (props) => {
  const [dump, setDump] = useState("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit dump" onSubmit={(values) => console.log(values)} />
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
  );
};

export default BrainDump;
