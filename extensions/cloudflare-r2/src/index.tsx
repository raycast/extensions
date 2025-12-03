import {
  Grid,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Clipboard,
  open,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  listObjects,
  deleteObject,
  uploadObject,
  getPublicUrl,
  getPresignedUrl,
  getContentType,
  generateFileName,
} from "./lib/r2-client";
import type { _Object } from "@aws-sdk/client-s3";
import * as fs from "fs";

interface ObjectWithUrl extends _Object {
  previewUrl?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function UploadForm({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { files: string[] }) {
    const files = values.files.filter(
      (f) => fs.existsSync(f) && fs.lstatSync(f).isFile(),
    );
    if (files.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Please select files" });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading...",
    });
    try {
      for (const filePath of files) {
        const fileName = generateFileName(filePath);
        const content = fs.readFileSync(filePath);
        const contentType = getContentType(filePath);
        await uploadObject(fileName, content, contentType);
      }
      toast.style = Toast.Style.Success;
      toast.title = `Uploaded successfully (${files.length} files)`;
      await open("raycast://confetti");
      onUploadSuccess();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload"
            icon={Icon.Upload}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Select Files" allowMultipleSelection />
    </Form>
  );
}

export default function Command() {
  const [objects, setObjects] = useState<ObjectWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchObjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listObjects();
      const sorted = result.sort((a, b) => {
        const timeA = a.LastModified?.getTime() ?? 0;
        const timeB = b.LastModified?.getTime() ?? 0;
        return timeB - timeA;
      });
      const withUrls = await Promise.all(
        sorted.map(async (obj) => {
          const publicUrl = getPublicUrl(obj.Key!);
          const previewUrl = publicUrl || (await getPresignedUrl(obj.Key!));
          return { ...obj, previewUrl };
        }),
      );
      setObjects(withUrls);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Load failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObjects();
  }, [fetchObjects]);

  const handleDelete = async (key: string) => {
    const confirmed = await confirmAlert({
      title: "Confirm Delete",
      message: `Are you sure you want to delete "${key}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting...",
    });
    try {
      await deleteObject(key);
      toast.style = Toast.Style.Success;
      toast.title = "Deleted successfully";
      fetchObjects();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Delete failed";
      toast.message = String(error);
    }
  };

  const handleCopyUrl = async (key: string) => {
    const publicUrl = getPublicUrl(key);
    if (publicUrl) {
      await Clipboard.copy(publicUrl);
      showToast({ style: Toast.Style.Success, title: "Public URL copied" });
    } else {
      const presigned = await getPresignedUrl(key);
      await Clipboard.copy(presigned);
      showToast({ style: Toast.Style.Success, title: "Presigned URL copied" });
    }
  };

  const handlePreview = async (key: string) => {
    const publicUrl = getPublicUrl(key);
    if (publicUrl) {
      await open(publicUrl);
    } else {
      const presigned = await getPresignedUrl(key);
      await open(presigned);
    }
  };

  const uploadAction = (
    <Action.Push
      title="Upload Files"
      icon={Icon.Upload}
      shortcut={{ modifiers: ["cmd"], key: "u" }}
      target={<UploadForm onUploadSuccess={fetchObjects} />}
    />
  );

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Medium}
      isLoading={isLoading}
      searchBarPlaceholder="Search objects..."
    >
      <Grid.EmptyView
        title="No Objects"
        description="Press Enter to upload files"
        actions={<ActionPanel>{uploadAction}</ActionPanel>}
      />
      {objects.map((obj) => (
        <Grid.Item
          key={obj.Key}
          title={obj.Key ?? ""}
          subtitle={formatBytes(obj.Size ?? 0)}
          content={{ source: obj.previewUrl ?? Icon.Document }}
          actions={
            <ActionPanel>
              <Action
                title="Preview"
                icon={Icon.Eye}
                onAction={() => handlePreview(obj.Key!)}
              />
              <Action
                title="Copy URL"
                icon={Icon.Link}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={() => handleCopyUrl(obj.Key!)}
              />
              {uploadAction}
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                onAction={() => handleDelete(obj.Key!)}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
