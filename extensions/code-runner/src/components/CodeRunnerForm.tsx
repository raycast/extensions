// components/CodeRunnerForm.tsx
import { Form, ActionPanel, Action, Image, Icon } from "@raycast/api";
import React from "react";
import { CodeExecutionResult, DetectedLanguage } from "../utils/codeRunner";
import { logoMap, SupportedLanguage } from "../utils/imageMap";

interface CodeRunnerFormProps {
  code: string;
  language: string;
  result: CodeExecutionResult | null;
  availableLanguages: DetectedLanguage[];
  isExecutingCode: boolean;
  onCodeChange: (newCode: string) => void;
  onLanguageChange: (newValue: string) => void;
  onRunCode: () => Promise<void>;
  onClearCode: () => void;
}

export const CodeRunnerForm: React.FC<CodeRunnerFormProps> = ({
  code,
  language,
  result,
  availableLanguages,
  isExecutingCode,
  onCodeChange,
  onLanguageChange,
  onRunCode,
  onClearCode,
}) => {
  return (
    <Form
      isLoading={isExecutingCode}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Code" onSubmit={onRunCode} />
          <Action title="Clear Code" onAction={onClearCode} />
          {result && result.stdout && <Action.CopyToClipboard title="Copy Output" content={result.stdout} />}
          {result && result.stderr && <Action.CopyToClipboard title="Copy Standard Error" content={result.stderr} />}
          {result && result.error && <Action.CopyToClipboard title="Copy Error Message" content={result.error} />}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="language" title="Language" value={language} onChange={onLanguageChange}>
        {availableLanguages.map((lang) => (
          <Form.Dropdown.Item
            key={lang.value}
            title={lang.name}
            value={lang.value}
            icon={{
              source: logoMap[lang.value as SupportedLanguage] as Image.Source,
              mask: Image.Mask.RoundedRectangle,
            }}
          />
        ))}
        <Form.Dropdown.Item
          key="detect-new-languages"
          title="✨ Detect New Languages"
          value="detect-new-languages"
          icon={Icon.MagnifyingGlass}
        />
      </Form.Dropdown>

      <Form.TextArea
        id="code"
        title="Code"
        placeholder="Enter your code here..."
        value={code}
        onChange={onCodeChange}
        autoFocus={true}
      />

      {result && (
        <React.Fragment>
          <Form.Separator />
          <Form.Description title="Output" text={result.stdout || "No standard output."} />
          {result.stderr && <Form.Description title="Standard Error" text={result.stderr} />}
          {result.error && <Form.Description title="Execution Error" text={result.error} />}
        </React.Fragment>
      )}
    </Form>
  );
};
