import path from "path";
import fs from "fs/promises";
import { fileTypeFromFile } from "file-type";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getSelectedFinderItems,
  Clipboard,
  Toast,
  showHUD,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getAllBuckets, getLastUsedBucket, getBucket, setLastUsedBucket } from "./lib/storage";
import { BucketConfig } from "./lib/types";
import { uploadFile } from "./lib/edgestore";

type Values = {
  bucketRefId: string;
  files: string[];
};

export default function Command() {
  const [buckets, setBuckets] = useState<BucketConfig[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedBucketRefId, setSelectedBucketRefId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [list, last] = await Promise.all([getAllBuckets(), getLastUsedBucket()]);
      let selected: { path: string }[] = [];
      try {
        selected = await getSelectedFinderItems();
      } catch {
        selected = [];
      }
      setBuckets(list);
      setSelectedBucketRefId(last?.bucketRefId ?? "");
      const paths = (Array.isArray(selected) ? selected : []).map((i) => i.path).filter(Boolean) as string[];
      setFiles(paths);
    })();
  }, []);

  async function handleSubmit(values: Values) {
    const bucketRefId = selectedBucketRefId || values.bucketRefId;
    if (!bucketRefId) {
      showToast({ title: "Choose a bucket", message: "Select a bucket to upload to" });
      return;
    }
    if (!values.files || values.files.length === 0) {
      showToast({ title: "No files selected", message: "Please choose one or more files" });
      return;
    }

    const config = await getBucket(bucketRefId);
    if (!config) {
      showToast({ title: "Bucket not found", message: "Try setting it up again" });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading 0%" });

    // Pre-calc total size for overall progress
    const filesWithStats = await Promise.all(values.files.map(async (p) => ({ path: p, stats: await fs.stat(p) })));
    const totalBytes = filesWithStats.reduce((sum, f) => sum + f.stats.size, 0);

    const urls: string[] = [];
    let uploadedBytes = 0;

    try {
      for (const { path: filePath, stats } of filesWithStats) {
        const file = await getFile(filePath);

        await uploadFile({
          bucketRefId,
          file,
          onProgressChange: (percent) => {
            const currentOverallBytes = uploadedBytes + (percent / 100) * stats.size;
            const overall = Math.min(100, Math.round((currentOverallBytes / totalBytes) * 100));
            toast.title = `Uploading ${overall}%`;
            toast.message = `${file.name} – ${Math.round(percent)}%`;
          },
        }).then((url) => {
          urls.push(url);
          uploadedBytes += stats.size;
          const overall = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
          toast.title = `Uploading ${overall}%`;
          toast.message = `${file.name} – 100%`;
        });
      }

      if (urls.length > 0) {
        await setLastUsedBucket(config.bucketRefId);
        if (urls.length) {
          await Clipboard.copy(urls.join("\n"));
        }
        toast.style = Toast.Style.Success;
        toast.title = "Upload complete";
        toast.message = `${urls.length} file(s) → ${config.bucketName}${
          config.temporaryFiles ? " (temporary)" : ""
        }${urls.length ? " (URLs copied)" : ""}`;
        await showHUD(`Uploaded ${urls.length} file(s). URLs copied to clipboard.`);
        await popToRoot();
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Upload failed";
        toast.message = `Could not upload to ${config.bucketName}`;
      }
    } catch (e: unknown) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      const message = e instanceof Error ? e.message : `Could not upload to ${config.bucketName}`;
      toast.message = message;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          buckets.length === 0
            ? "No buckets set up yet. Use 'Setup Bucket' first."
            : "Choose a bucket and files to upload."
        }
      />
      <Form.Dropdown id="bucketRefId" title="Bucket" value={selectedBucketRefId} onChange={setSelectedBucketRefId}>
        {buckets.map((b) => (
          <Form.Dropdown.Item
            key={b.bucketRefId}
            value={b.bucketRefId}
            title={`${b.bucketName}${b.temporaryFiles ? " (temporary)" : ""}`}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker id="files" title="Files" allowMultipleSelection value={files} onChange={setFiles} />
    </Form>
  );
}

async function getFile(filePath: string): Promise<File> {
  const fileBuffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);

  // Detect MIME using magic-number sniffing;
  let detectedMime: string | undefined;
  try {
    const ft = await fileTypeFromFile(filePath);
    detectedMime = ft?.mime;
  } catch {
    detectedMime = undefined;
  }

  const file = new File([new Uint8Array(fileBuffer)], fileName, {
    type: detectedMime,
  });

  return file;
}
