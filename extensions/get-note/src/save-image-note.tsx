import { Action, ActionPanel, Detail, Form, Icon, Toast, getSelectedFinderItems, showToast } from "@raycast/api";
import { basename, extname } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { useEffect, useState } from "react";

import { AuthenticateView } from "./components/authenticate-view";
import { NoteDetailScreen } from "./components/note-detail";
import { useKnowledgeBases } from "./hooks/use-knowledge-bases";
import {
  addNoteToKnowledgeBase,
  getImageUploadConfig,
  getImageUploadToken,
  getNoteDetail,
  saveImageNote,
  uploadImageToOSS,
  waitForTask,
} from "./lib/api";
import { normalizeGetNoteError } from "./lib/errors";
import { formatTaskProgress, normalizeTagInput } from "./lib/format";
import { ImageUploadConfig, NoteDetail as GetNoteDetail } from "./lib/types";
import { useGetNoteCredentials } from "./hooks/use-getnote-credentials";

const FALLBACK_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

type FormValues = {
  title: string;
  files: string[];
  imageUrls: string;
  tags: string;
  topicId: string;
};

function normalizeExtension(value: string): string {
  return value.replace(/^\./, "").toLowerCase();
}

function getImageExtension(path: string): string {
  return normalizeExtension(extname(path));
}

function extensionFromContentType(contentType: string | null): string {
  if (!contentType) {
    return "";
  }

  return CONTENT_TYPE_EXTENSIONS[contentType.split(";")[0].trim().toLowerCase()] || "";
}

function isSupportedImagePath(path: string, extensions = FALLBACK_EXTENSIONS): boolean {
  const extension = getImageExtension(path);
  return extensions.map(normalizeExtension).includes(extension);
}

function parseImageUrls(raw: string): string[] {
  const entries = raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const invalidEntries: string[] = [];
  const urls = entries.filter((item) => {
    try {
      const url = new URL(item);
      const isImageUrl = url.protocol === "http:" || url.protocol === "https:";

      if (!isImageUrl) {
        invalidEntries.push(item);
      }

      return isImageUrl;
    } catch {
      invalidEntries.push(item);
      return false;
    }
  });

  if (invalidEntries.length > 0) {
    throw new Error(`Invalid image URL: ${invalidEntries.join(", ")}`);
  }

  return urls;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function selectedFinderImagePaths(): Promise<string[]> {
  try {
    const items = await getSelectedFinderItems();
    return items.map((item) => item.path).filter((path) => isSupportedImagePath(path));
  } catch {
    return [];
  }
}

function validateImageData(input: { name: string; extension: string; size: number; config: ImageUploadConfig }): void {
  const supportedExtensions = input.config.support_extensions?.length
    ? input.config.support_extensions
    : FALLBACK_EXTENSIONS;
  const normalizedSupportedExtensions = supportedExtensions.map(normalizeExtension);
  const extension = normalizeExtension(input.extension);

  if (!extension || !normalizedSupportedExtensions.includes(extension)) {
    throw new Error(`Unsupported image format: ${input.name}`);
  }

  if (input.config.max_size_bytes && input.size > input.config.max_size_bytes) {
    throw new Error(
      `Image exceeds ${formatBytes(input.config.max_size_bytes)}: ${input.name} (${formatBytes(input.size)})`,
    );
  }
}

async function validateLocalFiles(paths: string[], config: ImageUploadConfig): Promise<void> {
  for (const path of paths) {
    const fileStat = await stat(path);

    if (!fileStat.isFile()) {
      throw new Error(`Not a file: ${path}`);
    }

    validateImageData({
      name: basename(path),
      extension: getImageExtension(path),
      size: fileStat.size,
      config,
    });
  }
}

function filenameFromUrl(url: URL, extension: string): string {
  const rawName = basename(url.pathname);
  let decodedName = rawName;

  try {
    decodedName = rawName ? decodeURIComponent(rawName) : "";
  } catch {
    decodedName = rawName;
  }

  const filename = decodedName || `image.${extension}`;

  if (getImageExtension(filename)) {
    return filename;
  }

  return `${filename}.${extension}`;
}

async function downloadImageUrl(
  urlString: string,
  config: ImageUploadConfig,
): Promise<{
  data: Buffer;
  filename: string;
  extension: string;
}> {
  const url = new URL(urlString);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image URL (HTTP ${response.status}): ${urlString}`);
  }

  const contentType = response.headers.get("content-type");
  const contentLength = Number(response.headers.get("content-length"));
  const contentTypeExtension = extensionFromContentType(contentType);
  const urlExtension = getImageExtension(url.pathname);
  const extension = contentTypeExtension || urlExtension;

  if (!contentType?.toLowerCase().startsWith("image/") && !urlExtension) {
    throw new Error(`URL does not look like an image: ${urlString}`);
  }

  if (config.max_size_bytes && Number.isFinite(contentLength) && contentLength > config.max_size_bytes) {
    throw new Error(
      `Image exceeds ${formatBytes(config.max_size_bytes)}: ${urlString} (${formatBytes(contentLength)})`,
    );
  }

  const data = Buffer.from(await response.arrayBuffer());
  const filename = filenameFromUrl(url, extension || "png");

  validateImageData({
    name: filename,
    extension,
    size: data.length,
    config,
  });

  return {
    data,
    filename,
    extension,
  };
}

export default function SaveImageNoteCommand() {
  const { credentials, isLoading: isAuthLoading, reload } = useGetNoteCredentials();
  const { knowledgeBases, isLoading: isKnowledgeBasesLoading } = useKnowledgeBases(
    Boolean(credentials) && !isAuthLoading,
  );
  const [files, setFiles] = useState<string[]>([]);
  const [results, setResults] = useState<GetNoteDetail[]>([]);
  const [resultFailures, setResultFailures] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !credentials || isSubmitting || files.length > 0) {
      return;
    }

    let cancelled = false;

    async function prefillFilesFromFinder() {
      const selectedImages = await selectedFinderImagePaths();

      if (!cancelled && selectedImages.length > 0) {
        setFiles(selectedImages);
      }
    }

    void prefillFilesFromFinder();

    return () => {
      cancelled = true;
    };
  }, [credentials, files.length, isAuthLoading, isSubmitting]);

  async function uploadImageData(input: { data: Buffer; filename: string; extension: string }): Promise<string> {
    const token = await getImageUploadToken({ extension: input.extension });
    const upload = await uploadImageToOSS({
      token,
      data: input.data,
      filename: input.filename,
    });

    return upload.accessUrl;
  }

  async function uploadLocalFiles(paths: string[], config: ImageUploadConfig, toast: Toast): Promise<string[]> {
    if (paths.length === 0) {
      return [];
    }

    await validateLocalFiles(paths, config);

    const uploadedUrls: string[] = [];

    for (const [index, path] of paths.entries()) {
      const filename = basename(path);
      const extension = getImageExtension(path);
      const progressMessage = `Uploading ${index + 1}/${paths.length}: ${filename}`;
      setStatus(progressMessage);
      toast.title = "Uploading Images";
      toast.message = progressMessage;

      const data = await readFile(path);
      uploadedUrls.push(await uploadImageData({ data, filename, extension }));
    }

    return uploadedUrls;
  }

  async function uploadRemoteImages(urls: string[], config: ImageUploadConfig, toast: Toast): Promise<string[]> {
    if (urls.length === 0) {
      return [];
    }

    const uploadedUrls: string[] = [];

    for (const [index, url] of urls.entries()) {
      const downloadMessage = `Downloading URL image ${index + 1}/${urls.length}`;
      setStatus(`${downloadMessage}

${url}`);
      toast.title = "Downloading Images";
      toast.message = downloadMessage;

      const image = await downloadImageUrl(url, config);
      const uploadMessage = `Uploading URL image ${index + 1}/${urls.length}: ${image.filename}`;
      setStatus(uploadMessage);
      toast.title = "Uploading Images";
      toast.message = uploadMessage;

      uploadedUrls.push(await uploadImageData(image));
    }

    return uploadedUrls;
  }

  async function createImageNotes(input: {
    title?: string;
    imageUrls: string[];
    tags: string[];
    toast: Toast;
  }): Promise<{ noteIds: string[]; failures: string[] }> {
    const noteIds: string[] = [];
    const failures: string[] = [];

    for (const [imageIndex, imageUrl] of input.imageUrls.entries()) {
      const createMessage = `Creating image note ${imageIndex + 1}/${input.imageUrls.length}`;
      setStatus(createMessage);
      input.toast.title = "Creating Image Note";
      input.toast.message = createMessage;

      try {
        const created = await saveImageNote({
          title: input.title,
          imageUrls: [imageUrl],
          tags: input.tags,
        });

        noteIds.push(...created.noteIds);

        for (const [taskIndex, task] of created.tasks.entries()) {
          setStatus(`GetNote is processing image note ${imageIndex + 1}/${input.imageUrls.length}...

Task ID: \`${task.task_id}\``);

          const noteId = await waitForTask(task.task_id, {
            onTick(progress) {
              const progressMessage = formatTaskProgress(progress, "Analyzing images and generating a note");
              const taskMessage =
                created.tasks.length > 1
                  ? `Task ${taskIndex + 1}/${created.tasks.length}`
                  : `Image ${imageIndex + 1}/${input.imageUrls.length}`;

              setStatus(`${progressMessage}

${taskMessage}
Task ID: \`${task.task_id}\``);
              input.toast.title = progress.status === "processing" ? "GetNote Processing Images" : "GetNote Image Task";
              input.toast.message = progressMessage;
            },
          });

          noteIds.push(noteId);
        }
      } catch (error) {
        failures.push(`Image ${imageIndex + 1}: ${normalizeGetNoteError(error)}`);
      }
    }

    return {
      noteIds: [...new Set(noteIds)],
      failures,
    };
  }

  async function handleSubmit(values: FormValues) {
    setResults([]);
    setResultFailures([]);
    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Saving Image Note",
    });

    try {
      const remoteImageUrls = parseImageUrls(values.imageUrls);
      const localFiles = values.files || [];
      const config = await getImageUploadConfig();
      const imageCount = localFiles.length + remoteImageUrls.length;

      if (imageCount === 0) {
        throw new Error("Choose at least one local image file or enter one image URL.");
      }

      const uploadedLocalUrls = await uploadLocalFiles(localFiles, config, toast);
      const uploadedRemoteUrls = await uploadRemoteImages(remoteImageUrls, config, toast);
      const imageUrls = [...uploadedLocalUrls, ...uploadedRemoteUrls];

      const { noteIds: uniqueNoteIds, failures } = await createImageNotes({
        title: values.title.trim() || undefined,
        imageUrls,
        tags: normalizeTagInput(values.tags),
        toast,
      });

      if (uniqueNoteIds.length === 0) {
        throw new Error(
          failures.length > 0
            ? failures.join("\n")
            : "The image note was created, but no note_id or task_id was returned.",
        );
      }

      if (values.topicId) {
        setStatus("Adding notes to the selected knowledge base...");
        toast.title = "Adding to Knowledge Base";
        toast.message = `Adding ${uniqueNoteIds.length} image note${uniqueNoteIds.length === 1 ? "" : "s"}`;
        await addNoteToKnowledgeBase(values.topicId, uniqueNoteIds);
      }

      const details = await Promise.all(uniqueNoteIds.map((noteId) => getNoteDetail(noteId)));
      setResults(details);
      setResultFailures(failures);

      toast.style = failures.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title =
        failures.length > 0
          ? `${uniqueNoteIds.length} Image Note${uniqueNoteIds.length === 1 ? "" : "s"} Saved, ${failures.length} Failed`
          : uniqueNoteIds.length === 1
            ? "Image Note Saved"
            : "Image Notes Saved";
      toast.message =
        details.length === 1 ? details[0].title || uniqueNoteIds[0] : `${uniqueNoteIds.length} notes created`;
      setStatus(failures.length > 0 ? `Some images failed:\n\n${failures.join("\n")}` : null);
    } catch (error) {
      const message = normalizeGetNoteError(error);
      setStatus(message);
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Save Image Note";
      toast.message = message;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuthLoading) {
    return <Detail isLoading markdown="Checking GetNote connection..." />;
  }

  if (!credentials) {
    return <AuthenticateView onConnected={reload} />;
  }

  if (results.length === 1 && resultFailures.length === 0) {
    return <NoteDetailScreen noteId={results[0].note_id} initialNote={results[0]} />;
  }

  if (results.length > 0) {
    return (
      <Detail
        markdown={`# Image Notes Saved

${results.map((note, index) => `${index + 1}. ${note.title || "Untitled"}\n   Note ID: \`${note.note_id}\``).join("\n")}
${resultFailures.length > 0 ? `\n## Failed\n\n${resultFailures.map((failure) => `- ${failure}`).join("\n")}` : ""}`}
        actions={
          <ActionPanel>
            {results.map((note, index) => (
              <Action.Push
                key={note.note_id}
                title={`Open Note ${index + 1}`}
                icon={Icon.Document}
                target={<NoteDetailScreen noteId={note.note_id} initialNote={note} />}
              />
            ))}
            <Action.CopyToClipboard title="Copy Note IDs" content={results.map((note) => note.note_id).join("\n")} />
            <Action
              title="Save Another Image Note"
              icon={Icon.Plus}
              onAction={() => {
                setStatus(null);
                setResults([]);
                setResultFailures([]);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isSubmitting || status) {
    return (
      <Detail
        isLoading={isSubmitting}
        markdown={`# Save Image Note to GetNote

${status || "Preparing..."}
`}
        actions={
          <ActionPanel>
            <Action
              title="Save Another Image Note"
              icon={Icon.Plus}
              onAction={() => {
                setStatus(null);
                setResults([]);
                setResultFailures([]);
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle="Save Image Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save to GetNote" icon={Icon.Image} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Optional" />
      <Form.FilePicker
        id="files"
        title="Image Files"
        value={files}
        onChange={setFiles}
        allowMultipleSelection
        canChooseDirectories={false}
        info="Defaults to selected Finder images when available."
      />
      <Form.TextArea
        id="imageUrls"
        title="Image URLs"
        placeholder="Optional. One image URL per line. URLs will be downloaded and uploaded to GetNote OSS first."
      />
      <Form.Dropdown id="topicId" title="Knowledge Base" defaultValue="" isLoading={isKnowledgeBasesLoading}>
        <Form.Dropdown.Item value="" title="None" />
        {knowledgeBases.map((topic) => (
          <Form.Dropdown.Item key={topic.topic_id} value={topic.topic_id} title={topic.name || topic.topic_id} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="tags" title="Tags" placeholder="Optional. Separate with commas or line breaks" />
    </Form>
  );
}
