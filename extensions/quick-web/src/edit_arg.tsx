import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { argExist, updateArg } from "./arg_repository";
import Style = Toast.Style;

export default function EditArgCommand({ oldArgName }: { oldArgName: string }) {
  const [argName, setArgName] = useState<string>(oldArgName);
  const [argNameErr, setArgNameErr] = useState<string | undefined>("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={() => {
              console.log("edit arg val: ", argName);
              updateArg(argName, oldArgName).then(() => {
                showToast(Style.Success, "Success").then(() => {
                  popToRoot().finally();
                });
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newArgName"
        value={argName}
        error={argNameErr}
        placeholder="set new arg name"
        onChange={async (newValue) => {
          setArgName(newValue);

          if (newValue.length == 0) {
            setArgNameErr("The field shouldn't be empty!");
            return;
          } else {
            setArgNameErr(undefined);
          }

          if (await argExist(newValue)) {
            setArgNameErr("This arg already exists!");
            return;
          } else {
            setArgNameErr(undefined);
          }
        }}
      />
    </Form>
  );
}
