import {
  Action,
  ActionPanel,
  Detail,
  Form,
  showToast,
  Toast,
  LocalStorage,
  openExtensionPreferences,
  showHUD,
  closeMainWindow,
} from "@raycast/api";
import { promises as fs } from "fs";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { Persona, TextUploadRequest, MAX_FILE_SIZE, FILE_SOURCE_RAYCAST, ALLOWED_FILE_TYPES } from "./types";
import { getLastPersona, getLastInputType, saveLastPersona, saveLastInputType } from "./preferences";

// Helper function to get MIME type from file extension
function getMimeType(fileName: string): string {
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".pdf": "application/pdf",
    ".rtf": "application/rtf",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

interface TrainingFormValues {
  personaId: string;
  inputType: "text" | "file";
  filename?: string;
  content?: string;
  file?: string[];
}

function TrainingForm() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultPersona, setDefaultPersona] = useState<string>("");
  const [defaultInputType, setDefaultInputType] = useState<"text" | "file">("text");
  const [inputType, setInputType] = useState<"text" | "file">("text");

  const handleSignOut = useCallback(async () => {
    try {
      // Clear stored API key
      await LocalStorage.removeItem("toneclone-api-key");

      // No additional cleanup needed for simple API key auth

      // Clear API key cache
      api.clearApiKeyCache();

      await showToast({
        style: Toast.Style.Success,
        title: "Signed out",
        message: "You have been signed out of ToneClone",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sign out failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [personasData, lastPersona, lastInputType] = await Promise.all([
        api.getPersonas(),
        getLastPersona("train"),
        getLastInputType(),
      ]);

      setPersonas(personasData);

      // Set default persona
      if (lastPersona && personasData.some((p) => p.personaId === lastPersona)) {
        setDefaultPersona(lastPersona);
      } else if (personasData.length > 0) {
        setDefaultPersona(personasData[0].personaId);
      }

      // Set default input type
      if (lastInputType) {
        setDefaultInputType(lastInputType);
        setInputType(lastInputType);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load personas",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = useCallback(
    async (values: TrainingFormValues) => {
      if (!values.personaId) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Please select a persona",
        });
        return;
      }

      if (values.inputType === "text") {
        if (!values.filename?.trim() || !values.content?.trim()) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: "Filename and content are required for text input",
          });
          return;
        }
      } else {
        if (!values.file || values.file.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Validation Error",
            message: "Please select a file",
          });
          return;
        }
      }

      try {
        setIsSubmitting(true);

        // Save preferences
        await saveLastPersona("train", values.personaId);
        await saveLastInputType(values.inputType);

        let uploadResponse;

        if (values.inputType === "text") {
          // Upload text content
          const textRequest: TextUploadRequest = {
            content: values.content!,
            filename: values.filename!.endsWith(".txt") ? values.filename! : `${values.filename!}.txt`,
            source: FILE_SOURCE_RAYCAST,
          };
          uploadResponse = await api.uploadText(textRequest);
        } else {
          // Handle file upload
          const filePath = values.file![0];

          try {
            // Read the file using Node.js fs (async)
            const fileBuffer = await fs.readFile(filePath);
            const fileName = filePath.split("/").pop() || "unknown-file";

            // Check file type
            const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf("."));
            if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
              throw new Error(
                `File type ${fileExtension} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
              );
            }

            // Check file size
            if (fileBuffer.length > MAX_FILE_SIZE) {
              throw new Error(
                `File size (${Math.round(fileBuffer.length / 1024 / 1024)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
              );
            }

            // Create a File object for upload with proper MIME type
            const file = new File([fileBuffer], fileName, {
              type: getMimeType(fileName),
            });

            uploadResponse = await api.uploadFile(file);
          } catch (fileError) {
            throw new Error(`Failed to read file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`);
          }
        }

        // Associate with persona
        await api.associateFilesWithPersona(values.personaId, {
          fileIds: [uploadResponse.fileId],
        });

        const personaName = personas.find((p) => p.personaId === values.personaId)?.name || "Unknown";

        // Close the window and show HUD on success
        await closeMainWindow();
        await showHUD(`✅ Training content uploaded to ${personaName}`);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Upload Failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [personas],
  );

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading personas..." />;
  }

  if (personas.length === 0) {
    return (
      <Detail
        markdown="# No Personas Found

You need to create at least one persona in ToneClone before you can upload training content.

Visit [ToneClone](https://app.toneclone.ai) to create your first persona."
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Training Content" onSubmit={handleSubmit} icon="📚" />
          <ActionPanel.Section title="Account">
            <Action
              title="Sign out"
              onAction={handleSignOut}
              icon="🚪"
              shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
            />
            <Action
              title="Extension Preferences"
              onAction={openExtensionPreferences}
              icon="⚙️"
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      <Form.Dropdown
        id="personaId"
        title="Persona"
        defaultValue={defaultPersona}
        info="Select the persona to train with this content"
      >
        {personas.map((persona) => (
          <Form.Dropdown.Item
            key={persona.personaId}
            value={persona.personaId}
            title={persona.name}
            icon={persona.trainingStatus === "completed" ? "✅" : "⏳"}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="inputType"
        title="Input Type"
        defaultValue={defaultInputType}
        onChange={(value) => setInputType(value as "text" | "file")}
        info="Choose whether to upload text content or a file"
      >
        <Form.Dropdown.Item value="text" title="Text Content" icon="📝" />
        <Form.Dropdown.Item value="file" title="File Upload" icon="📄" />
      </Form.Dropdown>

      {inputType === "text" && (
        <>
          <Form.TextField
            id="filename"
            title="Filename"
            placeholder="training-content"
            info="Name for the uploaded content (without extension)"
          />

          <Form.TextArea
            id="content"
            title="Content"
            placeholder="Enter the text content you want to use for training your persona..."
            info="The text that will be used to train your writing style"
          />
        </>
      )}

      {inputType === "file" && (
        <Form.FilePicker
          id="file"
          title="Training File"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          info="Select a file to upload for training (supports .txt, .doc, .docx, .pdf, .md, .rtf)"
        />
      )}
    </Form>
  );
}

function Command() {
  return <TrainingForm />;
}

export default Command;
