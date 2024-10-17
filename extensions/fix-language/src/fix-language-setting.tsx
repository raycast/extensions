import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { showToastError, LanguageFormValues, saveSetting, getSetting } from "./common";
import { useState, useEffect } from "react";

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);

  const { handleSubmit, itemProps, setValue } = useForm<LanguageFormValues>({
    initialValues: {
      firstLang: "",
      secondLang: "",
    },
    onSubmit(values) {
      if (values.firstLang === values.secondLang) {
        showToastError("First and second languages cannot be the same.");
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `First Language: ${values.firstLang}, Second Language: ${values.secondLang}`,
        });
        saveSetting(values);
      }
    },
    validation: {
      firstLang: FormValidation.Required,
      secondLang: FormValidation.Required,
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      const settings = await getSetting();
      setValue("firstLang", settings.firstLang);
      setValue("secondLang", settings.secondLang);
      setIsLoading(false);
    }
    fetchSettings();
  }, [setValue]);

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown {...itemProps.firstLang} title="First Language">
        <Form.Dropdown.Item value="en" title="English" />
        <Form.Dropdown.Item value="th" title="Thai" />
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.secondLang} title="Second Language">
        <Form.Dropdown.Item value="th" title="Thai" />
        <Form.Dropdown.Item value="en" title="English" />
      </Form.Dropdown>
    </Form>
  );
}
