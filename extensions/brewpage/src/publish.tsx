import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Detail,
  Form,
  LocalStorage,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { Choices, createPublisher, Publication, readSelectedFile, Report } from "./client";

type Values = Choices & { source: string; files: string[]; content: string; format: "html" | "markdown" };
const publish = createPublisher(fetch);

export default function Command() {
  const [source, setSource] = useState("paste");
  const [protection, setProtection] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Publication>();
  async function submit(values: Values) {
    if (busy) return;
    setBusy(true);
    try {
      let report: Report;
      if (values.source === "file") {
        if (values.files.length !== 1) throw new Error("Select exactly one HTML or Markdown file.");
        report = await readSelectedFile(values.files[0]);
      } else {
        report = { content: values.content, format: values.format };
      }
      const publication = await publish(report, values, {
        confirm: () =>
          confirmAlert({
            title: "Publish to BrewPage?",
            message: `${values.visibility === "public" ? "Public: discoverable in gallery and search." : "Unlisted: anyone with the link can read it."}\n${values.protection === "password" ? "Password required to read. Protected pages are not listed." : "No password restriction."}\nOnly this report will be uploaded to brewpage.app. New links request 15 days; existing links keep their expiry.`,
            primaryAction: { title: "Publish", style: Alert.ActionStyle.Destructive },
          }),
        saveOwner: (key, owner) => LocalStorage.setItem(key, JSON.stringify(owner)),
      });
      if (publication) setResult(publication);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Publication Failed",
        message: error instanceof Error ? error.message : "Unable to publish.",
      });
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <Detail
        markdown={`# Report Ready\n\n${result.link}\n\nExpires: ${result.expiresAt}\n\nKeep this reader link and note its expiry.`}
        actions={
          <ActionPanel>
            <Action title="Copy Reader Link" onAction={() => Clipboard.copy(result.link)} />
            <Action.OpenInBrowser title="Open Report" url={result.link} />
          </ActionPanel>
        }
      />
    );
  return (
    <Form
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Review Publication" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Upload only content you intend to share. Unlisted links are not access controls; choose a password to restrict readers. New links request 15 days; existing links keep their expiry. No clipboard or workspace is read automatically." />
      <Form.Dropdown id="source" title="Source" value={source} onChange={setSource}>
        <Form.Dropdown.Item value="paste" title="Paste Report" />
        <Form.Dropdown.Item value="file" title="Select File" />
      </Form.Dropdown>
      {source === "file" ? (
        <Form.FilePicker
          id="files"
          title="HTML or Markdown"
          allowMultipleSelection={false}
          canChooseDirectories={false}
        />
      ) : (
        <>
          <Form.TextArea id="content" title="Report" />
          <Form.Dropdown id="format" title="Format">
            <Form.Dropdown.Item value="markdown" title="Markdown" />
            <Form.Dropdown.Item value="html" title="HTML" />
          </Form.Dropdown>
        </>
      )}
      <Form.Dropdown id="visibility" title="Visibility" defaultValue="">
        <Form.Dropdown.Item value="" title="Choose Visibility…" />
        <Form.Dropdown.Item value="public" title="Public — Gallery and Search" />
        <Form.Dropdown.Item value="unlisted" title="Unlisted — Anyone With Link" />
      </Form.Dropdown>
      <Form.Dropdown id="protection" title="Reader Access" value={protection} onChange={setProtection}>
        <Form.Dropdown.Item value="" title="Choose Access…" />
        <Form.Dropdown.Item value="none" title="No Password" />
        <Form.Dropdown.Item value="password" title="Require Password" />
      </Form.Dropdown>
      {protection === "password" && <Form.PasswordField id="password" title="Reader Password" />}
    </Form>
  );
}
