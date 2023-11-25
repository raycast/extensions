import React from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { getLanguageFlag, languages } from "../languages";
import { AUTO_DETECT } from "../simple-translate";
import { LanguageCodeSet } from "../types";

export const AddLanguageForm: React.VFC<{
  onAddLanguage: (data: LanguageCodeSet) => void;
}> = ({ onAddLanguage }) => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add language set"
            onSubmit={(values: LanguageCodeSet) => {
              onAddLanguage(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="langFrom">
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="langTo">
        {languages
          .filter((lang) => lang.code !== AUTO_DETECT)
          .map((lang) => (
            <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
          ))}
      </Form.Dropdown>
    </Form>
  );
};
