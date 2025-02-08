import React from "react";
import { useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { languages } from "../lib/language";
import { useLanguage, LanguageSet } from "../lib/hooks";

export const AddLanguageForm: React.FC = () => {
  const navigation = useNavigation();
  const { addLang, isLoading } = useLanguage();
  const { handleSubmit, itemProps } = useForm<LanguageSet>({
    onSubmit: (values) => {
      addLang(values.source, values.target);
      navigation.pop();
    },
    initialValues: {
      source: "zh-CN",
      target: "en",
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Source Language" {...itemProps.source}>
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang.flag ?? "🌐"} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Target Language" {...itemProps.target}>
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang.flag ?? "🌐"} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
