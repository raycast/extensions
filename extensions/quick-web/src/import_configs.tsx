import { Action, ActionPanel, Form, popToRoot, showToast, Toast } from "@raycast/api";
import { ImportInput } from "./models";
import { useState } from "react";
import { importConfigs } from "./conifgs";
import Style = Toast.Style;

export default function ImportConfigsCommand() {
  const [json, setJson] = useState<string>("");
  const [jsonErr, setJsonErr] = useState<string | undefined>();

  function validateJson(s: string | undefined) {
    if (s == undefined || s.trim().length == 0) {
      setJsonErr("The configs can't be blank");
      return;
    } else {
      setJsonErr(undefined);
    }

    let parseSuccess = false;
    try {
      JSON.parse(s);
      parseSuccess = true;
    } catch (err) {
      console.log(err);
    }
    if (!parseSuccess) {
      setJsonErr("invalid json");
    } else {
      setJsonErr(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: ImportInput) => {
              // console.log("import config onSubmit", values);
              importConfigs(values.importedConfig).then(() => {
                popToRoot().finally(() => showToast(Style.Success, "import success"));
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text="Best to save the old configs first! This import action will overide the old configs!"
        title="!!!ATTETION!!!"
      />
      <Form.TextArea
        id="importedConfig"
        title="Configs"
        error={jsonErr}
        placeholder="!Attention! Best to save the old configs first. This import action will overide the old configs"
        info="!Attention! Best to save the old configs first. This import action will overide the old configs"
        onChange={(newValue) => {
          setJson(newValue);
          validateJson(newValue);
        }}
        value={json}
        onBlur={(event) => {
          validateJson(event.target.value?.trim());
        }}
      />
    </Form>
  );
}
