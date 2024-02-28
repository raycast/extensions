import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { argValueExists, updateArgValue } from "./arg_value_repository";
import { useState } from "react";

export default function EditArgValueCommand({ argName, oldArgValue }: { argName: string; oldArgValue: string }) {
  const [argValue, setArgValue] = useState<string>(oldArgValue);
  const [argValueErr, setArgValueErr] = useState<string | undefined>("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              console.log("edit arg val: ", argValue);
              updateArgValue(argName, oldArgValue, argValue).finally();
              popToRoot().finally();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newArgValue"
        title={"Arg Value"}
        value={argValue}
        error={argValueErr}
        onChange={async (newValue) => {
          setArgValue(newValue);

          if (newValue.length == 0) {
            setArgValueErr("The field shouldn't be empty!");
            return;
          } else {
            setArgValueErr(undefined);
          }

          if (await argValueExists(argName, newValue)) {
            setArgValueErr("This value already exists!");
            return;
          } else {
            setArgValueErr(undefined);
          }
        }}
      />
    </Form>
  );
}
