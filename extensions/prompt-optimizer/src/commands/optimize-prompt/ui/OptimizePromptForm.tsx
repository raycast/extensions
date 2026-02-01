import React from "react";
import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { TARGET_MODES } from "shared/constants";
import { OptimizePromptFormErrorState, OptimizePromptFormValues } from "../types";

type OptimizePromptFormProps = {
  isOptimizing: boolean;
  errorState: OptimizePromptFormErrorState | null;
  onSubmit: (values: OptimizePromptFormValues) => void;
};

export const OptimizePromptForm: React.FC<OptimizePromptFormProps> = ({ isOptimizing, errorState, onSubmit }) => {
  const defaultTargetMode = TARGET_MODES[0]?.key ?? "";
  const [targetMode, setTargetMode] = useCachedState("optimizePrompt.mode", defaultTargetMode);
  const selectedMode = TARGET_MODES.find((mode) => mode.key === targetMode);

  return (
    <Form
      isLoading={isOptimizing}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={errorState ? Icon.Repeat : Icon.Stars}
            title={errorState ? "Retry" : "Optimize"}
            onSubmit={onSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="targetMode"
        title="Mode"
        value={targetMode}
        onChange={setTargetMode}
        info={selectedMode?.description}
      >
        {TARGET_MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.key} value={mode.key} icon={mode.icon} title={mode.title} />
        ))}
      </Form.Dropdown>

      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Paste the prompt you want to optimize"
        enableMarkdown
        autoFocus
      />
    </Form>
  );
};
