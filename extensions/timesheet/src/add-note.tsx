import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  FormValidation,
  showFailureToast,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import * as fs from "fs";
import * as path from "path";
import {
  createNote,
  createNoteWithFile,
  getTimerProjectName,
  getTimerStatus,
} from "./api";

interface FormValues {
  noteText: string;
  attachFile: string[];
}

export default function AddNote() {
  const { pop } = useNavigation();
  const {
    data: timer,
    isLoading,
    error,
  } = useCachedPromise(getTimerStatus, [], { initialData: null });

  const taskId = timer?.task?.id;
  const blocking =
    timer && timer.status === "stopped"
      ? "No timer running. Start a timer first to add notes."
      : timer && !taskId
        ? "Timer has no associated task."
        : null;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      if (!taskId) return;
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Adding note...",
        });
        const noteText = values.noteText.trim();
        if (values.attachFile.length > 0) {
          const filePath = values.attachFile[0];
          const fileName = path.basename(filePath);
          const fileBuffer = fs.readFileSync(filePath);
          const uint8Array = new Uint8Array(
            fileBuffer.buffer,
            fileBuffer.byteOffset,
            fileBuffer.byteLength,
          );
          const blob = new Blob([uint8Array]);
          await createNoteWithFile({
            text: noteText,
            taskId,
            file: blob,
            fileName,
          });
          await showToast({
            style: Toast.Style.Success,
            title: "Note added with file",
            message: fileName,
          });
        } else {
          await createNote({ text: noteText, taskId });
          await showToast({
            style: Toast.Style.Success,
            title: "Note added",
            message: noteText.substring(0, 50),
          });
        }
        pop();
      } catch (err) {
        showFailureToast(err, { title: "Failed to add note" });
      }
    },
    validation: {
      noteText: FormValidation.Required,
    },
  });

  async function handlePasteClipboard() {
    try {
      const clipboard = await Clipboard.read();
      if (clipboard.file) {
        await showToast({
          style: Toast.Style.Success,
          title: "File detected",
          message: "Use the file picker to select it",
        });
      }
    } catch (err) {
      showFailureToast(err, { title: "Clipboard error" });
    }
  }

  if (error) {
    return (
      <Form>
        <Form.Description
          title="⚠️ Error"
          text={`Failed to load timer: ${String(error)}`}
        />
      </Form>
    );
  }

  if (blocking) {
    return (
      <Form>
        <Form.Description title="⚠️ Error" text={blocking} />
      </Form>
    );
  }

  const projectName = timer ? getTimerProjectName(timer) : "Loading...";

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Note"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <Action
            title="Paste from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "v" },
              Windows: { modifiers: ["ctrl"], key: "v" },
            }}
            onAction={handlePasteClipboard}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="📍 Timer"
        text={`Adding note to: ${projectName ?? "Unknown project"}`}
      />
      <Form.Separator />
      <Form.TextArea
        title="Note"
        placeholder="What are you working on?"
        {...itemProps.noteText}
      />
      <Form.FilePicker
        title="Attach File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        info="Attach a screenshot or any file to this note"
        {...itemProps.attachFile}
      />
    </Form>
  );
}
