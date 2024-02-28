import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useState } from "react";
import { ConfigInfo } from "./models";
import { addNewArg, argExist } from "./arg_repository";

export default function AddArgCommand() {
  const [argName, setArgName] = useState<string>("");

  const [argNameErr, setArgNameErr] = useState<string | undefined>();

  function dropArgNameErrIfNeeded() {
    if (argNameErr && argNameErr.trim().length > 0) {
      setArgNameErr(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: ConfigInfo) => {
              console.log("onSubmit", values);
              addNewArg(values.configName).then(() => {
                popToRoot().finally();
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="configName"
        title="Arg Name"
        placeholder="Pick a name for your arg"
        error={argNameErr}
        onChange={async (newValue) => {
          setArgName(newValue);

          if (newValue.length == 0) {
            setArgNameErr("The field shouldn't be empty!");
          } else {
            dropArgNameErrIfNeeded();
          }
          const exist = await argExist(newValue);
          if (exist) {
            setArgNameErr("this name already exists!");
          } else {
            dropArgNameErrIfNeeded();
          }
        }}
        value={argName}
      />
    </Form>
  );
}
