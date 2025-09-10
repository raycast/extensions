import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { FormValues } from "@/types";
import { messages } from "@/locale/en/messages";
import { generateFullPrompt } from "@/templates";
import { CustomTone } from "@/hooks/useCustomTones";
import { CustomTemplate } from "@/hooks/useCustomTemplates";

interface PromptDetailViewProps {
  formValues: FormValues;
  inputText: string;
  maxLength: number;
  isFollowUp?: boolean;
  getToneById: (id: string) => CustomTone | undefined;
  getTemplateById: (id: string) => CustomTemplate | undefined;
}

export default function PromptDetailView({
  formValues,
  inputText,
  maxLength,
  getToneById,
  getTemplateById,
  isFollowUp,
}: PromptDetailViewProps) {
  const fullPrompt = generateFullPrompt(formValues, inputText, maxLength, getToneById, getTemplateById, isFollowUp);

  const selectedTemplate = getTemplateById(formValues.template);
  const selectedTone = getToneById(formValues.tone);
  const toneName = selectedTone?.name || formValues.tone;

  // Display model name directly (now agent-agnostic)
  const modelDisplayName = formValues.model || messages.promptDetail.unknownModel;

  return (
    <Detail
      markdown={fullPrompt}
      navigationTitle={messages.promptDetail.title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={messages.promptDetail.targetFolderLabel}
            text={formValues.targetFolder || messages.promptDetail.defaultWorkingDirectory}
          />
          <Detail.Metadata.Label title={messages.promptDetail.modelLabel} text={modelDisplayName} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={messages.promptDetail.templateLabel} text={selectedTemplate?.name} />
          <Detail.Metadata.Label title={messages.promptDetail.toneLabel} text={toneName} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title={messages.actions.copyFullPrompt} content={fullPrompt} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}
