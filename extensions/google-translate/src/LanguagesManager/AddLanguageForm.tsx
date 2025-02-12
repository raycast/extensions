import React from "react";
import { Action, ActionPanel, Toast, Form, showToast } from "@raycast/api";
import { getLanguageFlag, LanguageCode, languages } from "../languages";
import { AUTO_DETECT } from "../simple-translate";
import { LanguageCodeSet } from "../types";

export const AddLanguageForm: React.VFC<{
  onAddLanguage: (data: LanguageCodeSet) => void;
}> = ({ onAddLanguage }) => {
  const [targetLanguages, setTargetLanguages] = React.useState<LanguageCode[]>(["en"]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add language set"
            onSubmit={(values: LanguageCodeSet) => {
              const filteredTargetLanguages = targetLanguages.filter((lang) => !!lang);
              if (!filteredTargetLanguages.length) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "No target languages",
                  message: "Please select at least one target language",
                });
                return;
              }
              onAddLanguage({
                langFrom: values.langFrom,
                langTo: filteredTargetLanguages,
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="langFrom" title="Source Language">
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
        ))}
      </Form.Dropdown>
      {targetLanguages.map((_, index) => {
        const value = targetLanguages[index];
        return (
          <Form.Dropdown
            id={`langTo.${index}`}
            title={`Target Language ${index + 1}`}
            key={index}
            value={value}
            onChange={(value) => {
              const newTargetLanguages = [...targetLanguages];
              newTargetLanguages[index] = value as LanguageCode;
              setTargetLanguages(newTargetLanguages);
            }}
          >
            {!value && <Form.Dropdown.Item value="" title="" />}
            {languages
              .filter((lang) => lang.code !== AUTO_DETECT)
              .map((lang) => (
                <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
              ))}
          </Form.Dropdown>
        );
      })}
      {(!!targetLanguages[targetLanguages.length - 1] || targetLanguages.length === 0) && (
        <Form.Dropdown
          id={`langTo.${targetLanguages.length}`}
          title={`Target Language ${targetLanguages.length}`}
          key={targetLanguages.length}
          value={""}
          onChange={(value) => {
            const newTargetLanguages = [...targetLanguages];
            newTargetLanguages.push(value as LanguageCode);
            setTargetLanguages(newTargetLanguages);
          }}
        >
          <Form.Dropdown.Item value="" title="" />
          {languages
            .filter((lang) => lang.code !== AUTO_DETECT)
            .map((lang) => (
              <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={getLanguageFlag(lang)} />
            ))}
        </Form.Dropdown>
      )}
    </Form>
  );
};
