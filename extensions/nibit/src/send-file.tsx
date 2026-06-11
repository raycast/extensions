import {
  Action,
  ActionPanel,
  Form,
  Icon,
  closeMainWindow,
  getSelectedFinderItems,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { promises as fs } from "fs";
import path from "path";
import { getSharedClient } from "./lib/client";
import { InputLimits } from "./lib/inputLimits";
import { ensureSignedIn } from "./lib/oauth";

type FormValues = {
  filePaths: string[];
  targetDeviceId: string;
};

function guessMimeType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".zip":
      return "application/zip";
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}

export default function Command() {
  const filePickerRef = useRef<Form.FilePicker>(null);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const { data: devices = [] } = useCachedPromise(async () => {
    const session = await ensureSignedIn();
    if (!session) return [];
    return getSharedClient().fetchSecureDevices();
  }, []);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      filePaths: [],
      targetDeviceId: "",
    },
    onSubmit: async (values) => {
      if (isSendingRef.current) return false;
      isSendingRef.current = true;
      setIsSending(true);
      const toast = await showToast({ style: Toast.Style.Animated, title: "Sending file…" });
      try {
        const session = await ensureSignedIn();
        if (!session) {
          toast.style = Toast.Style.Failure;
          toast.title = "Not signed in";
          return false;
        }
        const normalizedPath = values.filePaths[0]?.trim();
        if (!normalizedPath) {
          toast.style = Toast.Style.Failure;
          toast.title = "Send failed";
          toast.message = "Choose a file to send.";
          return false;
        }
        const stats = await fs.stat(normalizedPath);
        if (stats.size > InputLimits.FILE_BYTES) {
          toast.style = Toast.Style.Failure;
          toast.title = "Send failed";
          toast.message = `Files must be ${(InputLimits.FILE_BYTES / (1024 * 1024)).toFixed(0)} MB or smaller.`;
          return false;
        }
        const bytes = await fs.readFile(normalizedPath);
        const result = await getSharedClient().sendSecurePushFile(new Uint8Array(bytes), {
          fileName: path.basename(normalizedPath),
          mimeType: guessMimeType(normalizedPath),
          targetDeviceId: values.targetDeviceId || null,
        });
        if (result.error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Send failed";
          toast.message = result.error;
          return false;
        }
        toast.style = Toast.Style.Success;
        toast.title = "File sent";
        await closeMainWindow().catch((error) => {
          console.warn("[nibit] failed to close Raycast window after file send", error);
        });
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Send failed";
        console.warn("[nibit] send file failed", error);
        toast.message = "Unable to send file.";
        return false;
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    validation: {
      filePaths: (value) =>
        !value?.[0]?.trim() ? "Choose a file or launch from Finder with a file selected." : undefined,
    },
  });

  useEffect(() => {
    void getSelectedFinderItems()
      .then((items) => {
        const first = items.find((item) => item.path);
        if (first?.path) {
          setValue("filePaths", [first.path]);
        } else {
          filePickerRef.current?.focus();
        }
      })
      .catch(() => {
        filePickerRef.current?.focus();
      });
  }, [setValue]);

  const dropdownItems = useMemo(
    () => [
      { title: "All Devices", value: "" },
      ...devices.map((device) => ({
        title: device.display_name ?? device.device_name,
        value: device.id,
      })),
    ],
    [devices],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSending ? "Sending File…" : "Send File"}
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        ref={filePickerRef}
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
        {...itemProps.filePaths}
      />
      <Form.Dropdown title="Target" {...itemProps.targetDeviceId}>
        {dropdownItems.map((item) => (
          <Form.Dropdown.Item key={item.value || "all"} value={item.value} title={item.title} />
        ))}
      </Form.Dropdown>
      <Form.Description
        text={
          isSending
            ? "Sending… encrypting and uploading the file. Keep this window open."
            : "Launch from Finder with a file selected to prefill the picker, or choose a file here."
        }
      />
    </Form>
  );
}
