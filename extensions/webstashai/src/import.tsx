import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  List,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useRef } from "react";
import { readFile } from "fs/promises";
import { extname } from "path";
import { handleApiError, importBookmarks, getImportJob } from "./api/client";
import { isValidApiKey, isValidUrl } from "./helpers/utils";
import type { ImportJobResponse } from "./types";

const ALLOWED_EXTENSIONS = new Set([".html", ".csv"]);
const POLL_INTERVAL_MS = 2_000;

interface ImportFormValues {
  file: string[];
  urls: string;
}

export default function ImportCommand() {
  const apiKey = getPreferenceValues<{ apiKey: string }>().apiKey;
  if (!isValidApiKey(apiKey)) {
    return <InvalidKeyView />;
  }

  return <ImportForm />;
}

function ImportForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobStatus, setJobStatus] = useState<ImportJobResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const { handleSubmit, itemProps } = useForm<ImportFormValues>({
    async onSubmit(values) {
      const hasFile = values.file && values.file.length > 0;
      const hasUrls = values.urls.trim().length > 0;

      if (!hasFile && !hasUrls) {
        await showFailureToast("Nothing to import", {
          message: "Select a file or paste URLs",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        let content: string;
        let contentType: "text/html" | "text/csv";

        if (hasFile) {
          const filePath = values.file[0];
          const ext = extname(filePath).toLowerCase();

          if (!ALLOWED_EXTENSIONS.has(ext)) {
            await showFailureToast("Unsupported file type", {
              message: `Only .html and .csv files are accepted (got ${ext})`,
            });
            setIsSubmitting(false);
            return;
          }

          content = await readFile(filePath, "utf-8");
          contentType = ext === ".html" ? "text/html" : "text/csv";
        } else {
          // Convert raw URL list to CSV
          const urls = values.urls
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          const invalidUrls = urls.filter((u) => !isValidUrl(u));
          if (invalidUrls.length > 0) {
            await showFailureToast("Invalid URLs found", {
              message: `${invalidUrls.length} invalid URL(s). Each line must be a full URL starting with http:// or https://`,
            });
            setIsSubmitting(false);
            return;
          }

          if (urls.length === 0) {
            await showFailureToast("No URLs found", {
              message: "Paste one URL per line",
            });
            setIsSubmitting(false);
            return;
          }

          content = "url\n" + urls.join("\n");
          contentType = "text/csv";
        }

        const result = await importBookmarks(content, contentType);

        if (result.error) {
          await showFailureToast("Import failed", {
            message: result.error,
          });
          setIsSubmitting(false);
          return;
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Import Started",
          message: `${result.enqueued} of ${result.total} bookmarks queued${result.skipped ? ` (${result.skipped} already saved)` : ""}${result.skipped_quota ? ` (${result.skipped_quota} over quota)` : ""}`,
        });

        // Start polling for job progress if we have a job ID
        if (result.job_id) {
          pollJobStatus(result.job_id);
        } else {
          setIsSubmitting(false);
        }
      } catch (error) {
        const handled = await handleApiError(error);
        if (!handled) {
          await showFailureToast("Import failed", {
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
        setIsSubmitting(false);
      }
    },
    validation: {},
    initialValues: { file: [], urls: "" },
  });

  function pollJobStatus(jobId: string) {
    // Fetch immediately, then poll
    fetchJobStatus(jobId);

    pollRef.current = setInterval(() => {
      fetchJobStatus(jobId);
    }, POLL_INTERVAL_MS);
  }

  async function fetchJobStatus(jobId: string) {
    try {
      const job = await getImportJob(jobId, true);
      setJobStatus(job);

      if (job.status === "completed" || job.status === "failed") {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setIsSubmitting(false);

        if (job.status === "completed") {
          await showToast({
            style: Toast.Style.Success,
            title: "Import Complete",
            message: `${job.processed_urls} of ${job.total_urls} processed${job.failed_urls ? ` (${job.failed_urls} failed)` : ""}`,
          });
        } else {
          await showFailureToast("Import failed", {
            message: job.error || "Unknown error during import",
          });
        }
      }
    } catch {
      // Polling failure is not critical — just keep trying
    }
  }

  // If we have an active job, show progress view
  if (jobStatus) {
    return <ImportProgress job={jobStatus} onDone={() => setJobStatus(null)} />;
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import Bookmarks"
            icon={Icon.Download}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import Bookmarks"
        text="Upload a bookmark file (HTML or CSV) or paste URLs below."
      />
      <Form.FilePicker
        title="Bookmark File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        {...itemProps.file}
      />
      <Form.Separator />
      <Form.TextArea
        title="Or Paste URLs"
        placeholder={"https://example.com/page1\nhttps://example.com/page2"}
        {...itemProps.urls}
      />
    </Form>
  );
}

function ImportProgress({
  job,
  onDone,
}: {
  job: ImportJobResponse;
  onDone: () => void;
}) {
  const isActive = job.status === "pending" || job.status === "processing";
  const progress =
    job.total_urls > 0
      ? Math.round((job.processed_urls / job.total_urls) * 100)
      : 0;

  const statusEmoji =
    job.status === "completed"
      ? "Done"
      : job.status === "failed"
        ? "Failed"
        : "Processing";

  const markdown = [
    `# Import ${statusEmoji}`,
    "",
    `**Status:** ${job.status}`,
    `**Progress:** ${job.processed_urls} / ${job.total_urls} (${progress}%)`,
    `**Source:** ${job.source_type.toUpperCase()}`,
    "",
    job.failed_urls > 0
      ? `**Failed:** ${job.failed_urls} bookmark${job.failed_urls !== 1 ? "s" : ""}`
      : "",
    job.error ? `\n**Error:** ${job.error}` : "",
    job.failed_items && job.failed_items.length > 0
      ? [
          "",
          "## Failed Items",
          "",
          ...job.failed_items.map((item) => `- ${item.url}: ${item.error}`),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      isLoading={isActive}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!isActive && (
            <Action title="Import More" icon={Icon.Plus} onAction={onDone} />
          )}
        </ActionPanel>
      }
    />
  );
}

function InvalidKeyView() {
  return (
    <List>
      <List.EmptyView
        title="Invalid API Key"
        description="Your API key must start with 'wsk_'. Open extension preferences to update it."
        icon={Icon.ExclamationMark}
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={async () => {
                const { openExtensionPreferences } =
                  await import("@raycast/api");
                await openExtensionPreferences();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
