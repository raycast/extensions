import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import { FormValidation, useForm, useLocalStorage } from "@raycast/utils";
import fetch from "cross-fetch";

type FormValues = {
  memo: string;
  tags: string;
};

interface Preferences {
  api: string;
  defaultTags: string;
}

export default function Command() {
  const preferences: Preferences = getPreferenceValues();
  const { value: times, setValue: setTimes, isLoading } = useLocalStorage<number>("times", 1);

  const {
    handleSubmit,
    itemProps,
    setValue: setFormValues,
  } = useForm<FormValues>({
    initialValues: {
      tags: preferences.defaultTags,
    },
    validation: {
      memo: FormValidation.Required,
      tags: FormValidation.Required,
    },
    onSubmit: async (values) => {
      const resp = await fetch(preferences.api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // Specify the content type
        },
        body: JSON.stringify({ content: `${values.tags}\n${values.memo}` }),
      });
      console.log(resp.status, resp.statusText);
      if (resp.status !== 200) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: "Check that API MEMO URL is correct",
        });
      }
      const respData = await resp.json();
      if (respData?.code === 0) {
        showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "MEMO sent successfully",
        });
        setFormValues("memo", "");
        setTimes((times || 0) + 1);
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed",
          message: JSON.stringify(respData),
        });
      }
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send MEMO" onSubmit={handleSubmit} />
          <Action title="Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="memo"
        placeholder={`Let's write the ${times || 1}th memo from raycast`}
        {...itemProps.memo}
      />
      <Form.Separator />
      <Form.TextField title="tags" info="separated by space" {...itemProps.tags} />
    </Form>
  );
}
