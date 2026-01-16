import { Action, ActionPanel, Clipboard, Form, LocalStorage, popToRoot, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { BucketOption, DomainOption } from "../lib/options";
import { resolvePublicBaseUrl } from "../lib/options";
import type { Preferences } from "../lib/types";
import { uploadToR2, type UploadSource } from "../lib/upload";

const LS_LAST_BUCKET_ID = "r2u:lastBucketId";
const LS_LAST_DOMAIN_VALUE = "r2u:lastDomainValue";
const LS_LAST_COPY_FORMAT = "r2u:lastCopyFormat";

type FormValues = {
  bucketId: string;
  domainValue: string;
  copyFormat: "url" | "markdown" | "html";
};

function nameFromKey(key: string): string {
  const last = key.split("/").filter(Boolean).pop();
  return last || key;
}

function isLikelyImageFileName(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return false;
  return ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "bmp", "tif", "tiff", "heic", "heif"].includes(ext);
}

function escapeMarkdownText(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function escapeHtmlText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtmlAttr(text: string): string {
  return escapeHtmlText(text).replaceAll('"', "&quot;");
}

export function UploadForm(props: {
  title: string;
  prefs: Pick<
    Preferences,
    | "accountId"
    | "accessKeyId"
    | "secretAccessKey"
    | "autoCopyUrl"
    | "defaultFolderTemplate"
    | "defaultFilenameTemplate"
  >;
  bucketOptions: BucketOption[];
  domainOptions: DomainOption[];
  sources: UploadSource[];
}) {
  const { title, prefs, bucketOptions, domainOptions, sources } = props;

  const defaultBucketId = bucketOptions[0]?.id;
  const defaultDomainValue = domainOptions[0]?.value;

  const [initialValues, setInitialValues] = useState<FormValues | null>(null);

  useEffect(() => {
    (async () => {
      const lastBucketId = (await LocalStorage.getItem<string>(LS_LAST_BUCKET_ID)) || undefined;
      const lastDomainValue = (await LocalStorage.getItem<string>(LS_LAST_DOMAIN_VALUE)) || undefined;
      const lastCopyFormat = (await LocalStorage.getItem<string>(LS_LAST_COPY_FORMAT)) || undefined;

      const bucketOk =
        lastBucketId && bucketOptions.some((b) => b.id === lastBucketId) ? lastBucketId : defaultBucketId;
      const domainOk =
        lastDomainValue && domainOptions.some((d) => d.value === lastDomainValue)
          ? lastDomainValue
          : defaultDomainValue;

      const copyFormatOk =
        lastCopyFormat === "markdown" || lastCopyFormat === "html" || lastCopyFormat === "url" ? lastCopyFormat : "url";

      setInitialValues({ bucketId: bucketOk || "", domainValue: domainOk || "r2", copyFormat: copyFormatOk });
    })();
  }, [bucketOptions, defaultBucketId, defaultDomainValue, domainOptions]);

  const bucketById = useMemo(() => new Map(bucketOptions.map((b) => [b.id, b])), [bucketOptions]);

  async function onSubmit(values: FormValues) {
    const bucketOpt = bucketById.get(values.bucketId);
    if (!bucketOpt) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid bucket selection" });
      return;
    }

    await LocalStorage.setItem(LS_LAST_BUCKET_ID, values.bucketId);
    await LocalStorage.setItem(LS_LAST_DOMAIN_VALUE, values.domainValue);
    await LocalStorage.setItem(LS_LAST_COPY_FORMAT, values.copyFormat);

    const publicBaseUrl = resolvePublicBaseUrl({ prefs, bucket: bucketOpt.bucket, domainValue: values.domainValue });

    const defaultFolder = prefs.defaultFolderTemplate?.trim();
    const defaultFilename = prefs.defaultFilenameTemplate?.trim();

    const folderFromBucket = bucketOpt.pathPrefix?.trim();
    const filenameFromBucket = bucketOpt.filenameTemplate?.trim();

    const fallbackKeyConfig = {
      // If folder template is blank, upload to bucket root (no prefix)
      pathPrefix: defaultFolder ? defaultFolder : undefined,
      filenameTemplate: defaultFilename || "{name}_{time}.{ext}",
    };

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading…" });
    try {
      const uploaded: Array<{ url: string; key: string }> = [];
      for (let i = 0; i < sources.length; i++) {
        toast.message = sources.length > 1 ? `Uploading ${i + 1}/${sources.length}` : undefined;
        const res = await uploadToR2({
          prefs,
          bucket: bucketOpt.bucket,
          keyConfig: {
            keyTemplate: bucketOpt.keyTemplate,
            // If explicitly blank, treat as root (undefined)
            pathPrefix: folderFromBucket ? folderFromBucket : fallbackKeyConfig.pathPrefix,
            filenameTemplate: filenameFromBucket || fallbackKeyConfig.filenameTemplate,
          },
          publicBaseUrl,
          source: sources[i],
        });
        uploaded.push({ url: res.url, key: res.key });
      }

      if (prefs.autoCopyUrl) {
        const text =
          values.copyFormat === "html"
            ? uploaded
                .map((u) => `<a href="${escapeHtmlAttr(u.url)}">${escapeHtmlText(nameFromKey(u.key))}</a>`)
                .join("\n")
            : values.copyFormat === "markdown"
              ? uploaded
                  .map((u) => {
                    const fileName = nameFromKey(u.key);
                    const alt = escapeMarkdownText(fileName);
                    return isLikelyImageFileName(fileName) ? `![${alt}](${u.url})` : `[${alt}](${u.url})`;
                  })
                  .join("\n")
              : uploaded.map((u) => u.url).join("\n");

        await Clipboard.copy(text);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Uploaded";
      toast.message = prefs.autoCopyUrl ? "Copied to clipboard" : uploaded[uploaded.length - 1]?.url;
      await popToRoot({ clearSearchBar: true });
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Upload failed";
      toast.message = err instanceof Error ? err.message : String(err);
    }
  }

  if (!initialValues) {
    return <Form isLoading navigationTitle={title} />;
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload" onSubmit={onSubmit} />
        </ActionPanel>
      }
      initialValues={initialValues}
    >
      <Form.Dropdown id="bucketId" title="Bucket" storeValue>
        {bucketOptions.map((b) => (
          <Form.Dropdown.Item key={b.id} value={b.id} title={b.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="domainValue" title="Domain" storeValue>
        {domainOptions.map((d) => (
          <Form.Dropdown.Item key={d.id} value={d.value} title={d.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="copyFormat" title="Copy Format" storeValue>
        <Form.Dropdown.Item value="url" title="URL" />
        <Form.Dropdown.Item value="markdown" title="Markdown" />
        <Form.Dropdown.Item value="html" title="HTML" />
      </Form.Dropdown>
    </Form>
  );
}
