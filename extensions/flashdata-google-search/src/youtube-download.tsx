import { Action, ActionPanel, Detail, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useRef, useState } from "react";
import { readFile, stat } from "node:fs/promises";
import { client, docs } from "./lib/query-command";
import { videoId } from "./lib/tasks";
import { markdownText } from "./lib/flashdata";

function Job({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial),
    [receipt, setReceipt] = useState(""),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const api = client(),
        job = await api.jobs.get(id);
      if (job.source !== "youtube_download") throw new Error();
      setStatus(job.status);
      if (job.status === "completed") {
        const data = await api.jobs.result(id);
        setReceipt(JSON.stringify(data.results, null, 2));
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot Read Delivery",
        message: "Check the job ID, key, and result retention period. Do not resubmit the download.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Detail
      isLoading={busy}
      markdown={`# Cloud Delivery\n\n${markdownText(id)}\n\nStatus: ${markdownText(status)}${receipt ? "\n\n" + markdownText(receipt) : ""}`}
      actions={
        <ActionPanel>
          <Action title="Refresh Status and Receipt" onAction={refresh} />
          <Action.CopyToClipboard title="Copy Job ID" content={id} />
          {receipt && <Action.CopyToClipboard title="Copy Delivery Receipt" content={receipt} />}
          <Action.OpenInBrowser
            title="Open Job on FlashData"
            url={`https://flashdata.dev/app/jobs/${encodeURIComponent(id)}`}
          />
        </ActionPanel>
      }
    />
  );
}
type Values = { mode: string; term: string; file?: string[]; format?: string };
export default function Command() {
  const { push } = useNavigation(),
    lock = useRef(false),
    [mode, setMode] = useState("submit"),
    [busy, setBusy] = useState(false);
  async function submit(v: Values) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    let submitted = false;
    try {
      if (mode === "resume") {
        const id = v.term.trim();
        if (!/^job_[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Enter a FlashData job ID.");
        push(<Job id={id} initial="Refresh to check" />);
        return;
      }
      const id = videoId(v.term),
        file = v.file?.[0];
      if (!file || !file.toLowerCase().endsWith(".json"))
        throw new Error("Choose your private storage configuration JSON file.");
      const info = await stat(file);
      if (!info.isFile() || info.size > 65536) throw new Error("Choose a JSON file under 64 KiB.");
      let storage;
      try {
        storage = JSON.parse(await readFile(file, "utf8"));
      } catch {
        throw new Error("Cannot read the storage configuration as JSON.");
      }
      if (!storage?.storage_type || !storage.storage_url)
        throw new Error("The file must contain a storage type and bucket or container.");
      const api = client();
      submitted = true;
      const receipt = await api.youtube.download({
        video_id: id,
        storage,
        download_type: v.format === "audio" ? "audio" : "audio_video",
        output_format: v.format === "audio" ? "m4a" : "mp4",
      });
      push(<Job id={receipt.id} initial={receipt.status} />);
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Delivery Not Confirmed",
        message: submitted
          ? "Check your FlashData history and storage settings before submitting again."
          : e instanceof Error
            ? e.message
            : "Check the inputs.",
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={mode === "resume" ? "View Job" : "Submit Delivery"} onSubmit={submit} />
          <Action.OpenInBrowser title="Open Storage Setup Guide" url={docs("youtube_download")} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Action" value={mode} onChange={setMode}>
        <Form.Dropdown.Item value="submit" title="Deliver to Cloud Storage" />
        <Form.Dropdown.Item value="resume" title="Check Existing Job" />
      </Form.Dropdown>
      <Form.TextField key={mode} id="term" title={mode === "resume" ? "Job ID" : "Video URL or ID"} />
      {mode === "submit" && (
        <>
          <Form.Dropdown id="format" title="Media">
            <Form.Dropdown.Item value="video" title="Video with Audio (MP4)" />
            <Form.Dropdown.Item value="audio" title="Audio Only (M4A)" />
          </Form.Dropdown>
          <Form.FilePicker
            id="file"
            title="Private Storage JSON"
            allowMultipleSelection={false}
            canChooseDirectories={false}
          />
          <Form.Description text="Submitting sends the selected destination credentials to FlashData and incurs delivery charges. Use a scoped cloud credential and media you have permission to export. Nothing is downloaded to your Mac." />
        </>
      )}
    </Form>
  );
}
