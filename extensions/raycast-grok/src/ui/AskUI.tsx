import { Action, ActionPanel, Form, getSelectedText, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useMemo, useState } from "react";
import { ACCEPT_IMAGE_TYPES } from "../constants/accept";
import { isVisionModel } from "../utils";
import { PreferenceModel } from "../models/preference.model";

export interface AskUIProps {
  onSubmit: (values: AslFormData) => void;
  buffer?: string[];
}

export interface AslFormData {
  query: string;
  files?: string[];
}

export default function AskUI(props: AskUIProps) {
  const [textarea, setTextarea] = useState("");
  const { defaultModel, customModel } = getPreferenceValues<PreferenceModel>();
  const currentModel = customModel?.trim() || defaultModel;
  const supportsVision = isVisionModel(currentModel);

  const hasBuffer = useMemo(() => props.buffer && props.buffer.length > 0, [props.buffer]);

  const handleClipboardAction = useCallback(async () => {
    try {
      const selectedText = await getSelectedText();
      setTextarea(text => text + selectedText);
    } catch (error) {
      console.error(error);
      await showFailureToast("Could not get the selected text");
    }
  }, []);

  const handleSubmit = useCallback(
    (values: AslFormData) => {
      // Validate input
      if (!values.query || values.query.trim() === "") {
        showToast({
          style: Toast.Style.Failure,
          title: "Please enter a question",
          message: "The prompt field cannot be empty",
        });
        return;
      }

      // Merge buffer files with form files
      const allFiles = [...(props.buffer || []), ...(values.files || [])];
      const finalValues = { ...values, files: allFiles };

      // Check if files are provided and validate them
      if (allFiles && allFiles.length > 0) {
        console.debug(allFiles);

        // Check if current model supports vision
        if (!supportsVision) {
          showToast({
            style: Toast.Style.Failure,
            title: "Model doesn't support images",
            message: `${currentModel} is a text-only model. Please switch to a vision model like grok-2-vision-1212 or grok-beta in preferences to analyze images.`,
          });
          return;
        }

        const invalidFiles = allFiles.filter(file => {
          const ext = file.toLowerCase().split(".").pop();
          return !ACCEPT_IMAGE_TYPES.includes(ext || "");
        });

        if (invalidFiles.length > 0) {
          showToast({
            style: Toast.Style.Failure,
            title: "Invalid file type",
            message: `Please select only image files (${ACCEPT_IMAGE_TYPES.join(", ").toUpperCase()})`,
          });
          return;
        }
      }

      props.onSubmit(finalValues);
    },
    [props, supportsVision, currentModel]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Grok AI" icon={Icon.Message} onSubmit={handleSubmit} />
          <Action
            icon={Icon.Clipboard}
            title="Append Selected Text"
            onAction={handleClipboardAction}
            shortcut={{ modifiers: ["ctrl", "shift"], key: "v" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        title="Prompt"
        id="query"
        value={textarea}
        onChange={value => setTextarea(value)}
        placeholder="Ask Grok AI a question..."
        info="Enter your question or prompt for Grok AI. You can also attach images for visual analysis."
      />
      <Form.Separator />
      {hasBuffer ? (
        <Form.Description
          title="Screenshot Analysis"
          text={`📸 Screenshot captured and ready for analysis. ${props.buffer?.length} image(s) attached.`}
        />
      ) : (
        <>
          <Form.Description
            title="Image Analysis"
            text={
              supportsVision
                ? "Upload an image that you want Grok AI to analyze along with your prompt."
                : `⚠️ Current model (${currentModel}) doesn't support images. Switch to a vision model in preferences to enable image analysis.`
            }
          />
          {supportsVision && (
            <Form.FilePicker
              id="files"
              title="Select Image"
              allowMultipleSelection={false}
              canChooseFiles={true}
              canChooseDirectories={false}
              info="Supported formats: JPG, PNG, GIF, WebP, BMP, HEIC"
            />
          )}
        </>
      )}
      <Form.Description
        text={
          hasBuffer
            ? "💡 Ask any question about the captured screenshot."
            : supportsVision
              ? "⚠️ Note: Image data will not be carried over if you continue in Chat."
              : "💡 Vision-capable models: grok-2-vision-1212, grok-beta"
        }
      />
    </Form>
  );
}
