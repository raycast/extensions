import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import SaveTemplateForm from "./SaveTemplateForm";
import { FormValues, PromptFormActionsProp } from "../types";
import { validateForm } from "../utils/validation";
import buildPrompt from "../utils/buildPrompt";
import PreviewPrompt from "./PreviewPrompt";

const PromptFormActions = ({ formState, templateState }: PromptFormActionsProp) => {
  const { push } = useNavigation();
  const { formValues, resetFormValues, setTaskError } = formState;
  const {
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    deleteAllTemplates,
  } = templateState;

  const validateAndGetPrompt = (values: FormValues): string | undefined => {
    const errors = validateForm(values);
    if (errors.task) {
      setTaskError(errors.task);
      return;
    }
    const generatedPrompt = buildPrompt(values);
    return generatedPrompt;
  };

  const handlePreviewPrompt = async (values: FormValues) => {
    const prompt = validateAndGetPrompt(values);
    if (!prompt) return;

    push(<PreviewPrompt prompt={prompt} />);
  };

  const handleCopyToClipboard = async (values: FormValues) => {
    try {
      const prompt = validateAndGetPrompt(values);
      if (!prompt) return;

      await Clipboard.copy(prompt);
      await showHUD("Copied to Clipboard");
    } catch (error) {
      await showHUD("Failed to Copy Prompt");
      console.log("Clipboard error:", error);
    }
  };

  const handleDeleteTemplate = async () => {
    const confirmed = await confirmAlert({
      title: `Delete Template "${templates.find((t) => t.id === selectedTemplateId)?.title}"`,
      message: "Are you sure you want to delete this template?",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) return;

    try {
      await deleteTemplate();
      await showToast({
        style: Toast.Style.Success,
        title: "Template deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete template",
        message: String(error),
      });
    }
  };

  const handleDeleteAllTemplates = async () => {
    const confirmed = await confirmAlert({
      title: "Delete All Template",
      message: `Are you sure you want to delete all ${templates.length - 1} templates? This cannot be undone.`,
      primaryAction: {
        title: "Delete All",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await deleteAllTemplates();
      await showToast({
        style: Toast.Style.Success,
        title: "All templates deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete templates",
        message: String(error),
      });
    }
  };

  return (
    <ActionPanel>
      <Action.SubmitForm title="Copy to Clipboard" icon={Icon.Clipboard} onSubmit={handleCopyToClipboard} />
      <Action.SubmitForm
        title="Preview Prompt"
        icon={Icon.Eye}
        onSubmit={handlePreviewPrompt}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "y" },
          windows: { modifiers: ["ctrl"], key: "y" },
        }}
      />
      <Action.Push
        title="Save as Template"
        icon={Icon.PlusSquare}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "s" },
          windows: { modifiers: ["ctrl"], key: "s" },
        }}
        target={
          <SaveTemplateForm
            addTemplate={addTemplate}
            setSelectedTemplateId={setSelectedTemplateId}
            templates={templates}
            formValues={formValues}
            isUpdate={false}
            initialTitle={templates.find((t) => t.id === selectedTemplateId && t.id !== "none")?.title ?? ""}
          />
        }
      />

      {selectedTemplateId !== "none" && (
        <>
          <Action.Push
            title="Update Template"
            icon={Icon.Repeat}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "u" },
              windows: { modifiers: ["ctrl"], key: "u" },
            }}
            target={
              <SaveTemplateForm
                addTemplate={addTemplate}
                updateTemplate={updateTemplate}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
                templates={templates}
                formValues={formValues}
                isUpdate={true}
                initialTitle={templates.find((t) => t.id === selectedTemplateId)?.title ?? ""}
              />
            }
          />
          <Action
            title="Delete Template"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "d" },
              windows: { modifiers: ["ctrl", "shift"], key: "d" },
            }}
            onAction={handleDeleteTemplate}
          />
          <Action
            title="New Empty Template"
            icon={Icon.BlankDocument}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "n" },
              windows: { modifiers: ["ctrl"], key: "n" },
            }}
            onAction={() => {
              setSelectedTemplateId("none");
              resetFormValues();
            }}
          />
        </>
      )}

      <Action
        title="Clear Form"
        icon={Icon.Eraser}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "d" },
          windows: { modifiers: ["ctrl"], key: "d" },
        }}
        onAction={async () => {
          resetFormValues();
          setTaskError(undefined);
          await showToast({
            style: Toast.Style.Success,
            title: "Form cleared",
          });
        }}
      />

      <Action
        title="Delete All Templates"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift", "opt"], key: "d" },
          windows: { modifiers: ["ctrl", "shift", "alt"], key: "d" },
        }}
        onAction={handleDeleteAllTemplates}
      />
    </ActionPanel>
  );
};

export default PromptFormActions;
