import { Form, ActionPanel, useNavigation, Action, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import { dataAtom } from "../common/atoms";
import { useAtom } from "jotai";

export default function MinForm({ taskId }: { taskId: string }) {
  const [DATA, SetData] = useAtom(dataAtom);
  const [isLoading, setIsLoading] = useState<boolean>();
  const [minError, setMinError] = useState<string | undefined>();
  const { pop } = useNavigation();

  const minErrorValid = () => {
    if (minError && minError.length > 0) {
      setMinError(undefined);
    }
  };
  const isInt = (v: string | undefined) => {
    if (v == undefined) {
      return false;
    }
    const reg = /^[1-9][0-9]*$/;
    return reg.test(v);
  };

  type minFormType = {
    min: string;
  };

  const submit = (sd: minFormType) => {
    if (!isInt(sd.min)) {
      setMinError("The field need a integer!");
      return;
    }
    setIsLoading(true);
    const min = Number(sd.min);
    const d = JSON.parse(JSON.stringify(DATA));
    for (const i in d) {
      if (d[i].id == taskId) {
        d[i].sec = min * 60;
        break;
      }
    }
    SetData(d);
    setIsLoading(false);
    launchCommand({
      name: "menubar",
      type: LaunchType.UserInitiated,
    });
    pop();
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="min"
        title="Minute"
        info="(minute) required"
        error={minError}
        onChange={minErrorValid}
        onBlur={(event) => {
          const v = event.target.value;
          if (v?.length == 0) {
            setMinError("The field should't be empty!");
          } else if (!isInt(v)) {
            setMinError("The field need a integer!");
          } else {
            minErrorValid();
          }
        }}
      />
    </Form>
  );
}
