import {
  Action,
  ActionPanel,
  Clipboard,
  launchCommand,
  LaunchType,
  LocalStorage,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import { ImageResult } from "../../lib/compatible-images/images";
import { getConfig } from "../../lib/compatible-images/config";
import { modelKey } from "../../lib/compatible-images/provider-settings";
import { jobsDirectory, latestJob, latestJobKey } from "../../lib/compatible-images/background";
import { ImageJob, isActive, saveJob } from "../../lib/compatible-images/jobs";
import ModelPicker from "./ModelPicker";
import SaveAs from "./SaveAs";

type Values = {
  prompt: string;
  images: string[];
  size: string;
  quality: string;
};
export default function Command(props: { initialImage?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<ImageJob>();
  const [error, setError] = useState<string>();
  const submission = useRef(false);
  const submittedJob = useRef<string | undefined>(undefined);
  const shown = useRef<string | undefined>(undefined);
  const { push } = useNavigation();
  const busy = submitting || loading || isActive(job);
  useEffect(() => {
    let disposed = false;
    async function refresh() {
      try {
        const next = await latestJob();
        if (!disposed) {
          setJob(next);
          setLoading(false);
        }
      } catch {
        if (!disposed) {
          setError("Could not read the previous image job. Check your saved images before retrying.");
          setLoading(false);
        }
      }
    }
    void refresh();
    const timer = setInterval(refresh, 1500);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (
      job?.status === "succeeded" &&
      job.result &&
      shown.current !== job.id &&
      (!props.initialImage || submittedJob.current === job.id)
    ) {
      shown.current = job.id;
      push(<Result result={job.result} />);
    }
  }, [job, push, props.initialImage]);
  async function submit(values: Values) {
    if (busy || submission.current) return;
    if (!values.prompt.trim()) {
      setError("Enter an image prompt.");
      return;
    }
    submission.current = true;
    setSubmitting(true);
    let pending: ImageJob | undefined;
    try {
      const previous = await latestJob();
      if (isActive(previous)) {
        setJob(previous);
        return;
      }
      const config = await getConfig();
      pending = { id: randomUUID(), startedAt: Date.now(), status: "pending" };
      await saveJob(jobsDirectory, pending);
      await LocalStorage.setItem(latestJobKey, pending.id);
      submittedJob.current = pending.id;
      setJob(pending);
      await launchCommand({
        name: "run-image-job",
        type: LaunchType.Background,
        context: {
          jobId: pending.id,
          input: { prompt: values.prompt, imagePath: values.images[0], size: values.size, quality: values.quality },
          providerKey: modelKey(config),
          model: config.model,
        },
      });
      await showToast({ title: "Creating image in background", message: "You can close this window and return later" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start image job";
      // A launch error may be ambiguous. Leave any created job pending rather than retrying it.
      setError(message);
      await showToast({ style: Toast.Style.Failure, title: "Could not start image job", message });
    } finally {
      submission.current = false;
      setSubmitting(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={busy ? "Creating Image…" : "Create Image"} icon={Icon.Stars} onSubmit={submit} />
          {job?.result && (
            <Action.Push title="View Latest Image" icon={Icon.Image} target={<Result result={job.result} />} />
          )}
          <Action.Push title="Choose Default Model" icon={Icon.Gear} target={<ModelPicker />} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      {job && (
        <Form.Description
          title="Latest Image Job"
          text={
            isActive(job)
              ? "Creating in background. You can close Raycast and return here later."
              : job.status === "failed"
              ? job.error || "Image creation failed."
              : job.status === "succeeded"
              ? "Image saved. Use View Latest Image in the action menu."
              : "Job status unknown: Raycast may have stopped it. Check your provider and saved images before submitting again; it will not retry automatically."
          }
        />
      )}
      <Form.Description text="Set Image Provider Base URL and Image Provider API Key in extension preferences, then use Choose Default Model in the action menu (⌘K)." />
      <Form.TextArea
        id="prompt"
        title="Prompt"
        placeholder="Describe an image, or what to change in a reference image…"
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.FilePicker
        id="images"
        title="Reference Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        defaultValue={props.initialImage ? [props.initialImage] : []}
        info="Optional PNG, JPEG, or WebP. Add an image to edit it."
      />
      <Form.Dropdown id="size" title="Size" defaultValue="default">
        <Form.Dropdown.Item value="default" title="Provider Default" />
        <Form.Dropdown.Item value="1024x1024" title="Square · 1024 × 1024" />
        <Form.Dropdown.Item value="1536x1024" title="Landscape · 1536 × 1024" />
        <Form.Dropdown.Item value="1024x1536" title="Portrait · 1024 × 1536" />
      </Form.Dropdown>
      <Form.Dropdown id="quality" title="Quality" defaultValue="default">
        {["default", "auto", "low", "medium", "high"].map((value) => (
          <Form.Dropdown.Item
            key={value}
            value={value}
            title={value === "default" ? "Provider Default" : value[0].toUpperCase() + value.slice(1)}
          />
        ))}
      </Form.Dropdown>
      <Form.Description text="Images are sent to your configured API and saved locally. Size and quality support depends on the selected model." />
    </Form>
  );
}
function Result({ result }: { result: ImageResult }) {
  return (
    <Detail
      markdown={result.markdown}
      actions={
        <ActionPanel>
          <Action.Open title="Open Image" target={result.path} />
          <Action
            title="Copy Image"
            icon={Icon.Clipboard}
            onAction={async () => {
              await Clipboard.copy({ file: result.path });
              await showToast({ title: "Image copied" });
            }}
          />
          <Action.ShowInFinder path={result.path} />
          <Action.Push title="Save as…" icon={Icon.Download} target={<SaveAs path={result.path} />} />
          <Action.Push title="Edit This Image" icon={Icon.Pencil} target={<Command initialImage={result.path} />} />
          <Action.CopyToClipboard title="Copy Image Path" content={result.path} />
        </ActionPanel>
      }
    />
  );
}
