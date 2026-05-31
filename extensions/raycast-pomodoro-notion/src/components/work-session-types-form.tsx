import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import { getWorkSessionTypes, saveWorkSessionTypes } from "../lib/preferences";

type FormValues = {
  sessionTypes: string;
};

type WorkSessionTypesFormProps = {
  onSaved?: (types: string[]) => Promise<void>;
};

export function WorkSessionTypesForm(props: WorkSessionTypesFormProps) {
  const { onSaved } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const types = values.sessionTypes
      .split("\n")
      .map((value) => value.trim())
      .filter(
        (value, index, array) => value !== "" && array.indexOf(value) === index,
      );

    if (types.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "作業種類を 1 つ以上入力してください",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await saveWorkSessionTypes(types);
      if (onSaved) {
        await onSaved(types);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "作業種類を更新しました",
      });
      pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="作業種類を保存" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="入力方法"
        text="1 行につき 1 つの作業種類を入力します。重複と空行は自動で除外します。"
      />
      <Form.TextArea
        id="sessionTypes"
        title="作業種類"
        defaultValue={getWorkSessionTypes().join("\n")}
      />
    </Form>
  );
}
