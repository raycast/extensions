import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { RunVal, UserVal, Val } from "../types";
import { ValRun } from "./ValRun";

export const ValRunWithArgs = ({ val }: { val: Val | RunVal | UserVal }) => {
  const { push } = useNavigation();
  const handleSubmit = ({ args }: { args: string }) => {
    const values = args.split("\n").map((item: string) => {
      try {
        return JSON.parse(item);
      } catch (err) {
        return item;
      }
    });
    push(<ValRun val={val} args={values} />);
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Val" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="args" title="Arguments" autoFocus={true} storeValue={true} info="" />
      <Form.Description title="" text="Write one argument per line. Empty lines will be passed as an empty string." />
    </Form>
  );
};
