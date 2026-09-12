import "./lib/patch-url.js";

import { Action, ActionPanel, Form, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { readFileSync } from "fs";
import { basename } from "path";
import { useEffect, useState } from "react";
import { getSubnotoClient, listWorkspaces } from "./lib/subnoto.js";
import type { Preferences, Workspace } from "./lib/types.js";

interface FormValues {
  file: string[];
  title: string;
  workspace: string;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const preferences = getPreferenceValues<Preferences>();
        const data = await listWorkspaces(preferences);
        setWorkspaces(data);
      } catch {
        setWorkspaces([]);
      } finally {
        setWorkspacesLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(values: FormValues) {
    if (!values.file || values.file.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a PDF or Word document to upload",
      });
      return;
    }

    const filePath = values.file[0];
    const fileName = basename(filePath);
    const title = values.title || fileName.replace(/\.[^/.]+$/, "");

    // Validate file type
    const extension = filePath.toLowerCase().split(".").pop();
    if (!["pdf", "doc", "docx", "odt", "rtf"].includes(extension || "")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: "Please select a PDF or Word document (.pdf, .doc, .docx, .odt, .rtf)",
      });
      return;
    }

    const workspaceUuid = values.workspace;
    if (!workspaceUuid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No workspace selected",
        message: "Please select a workspace to upload to.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const preferences = getPreferenceValues<Preferences>();
      const client = await getSubnotoClient(preferences);

      await showToast({
        style: Toast.Style.Animated,
        title: "Uploading document...",
      });

      // Read file and upload
      const fileBuffer = readFileSync(filePath);
      const result = await client.uploadDocument({
        workspaceUuid,
        fileBuffer,
        envelopeTitle: title,
      });

      if (!result?.envelopeUuid) {
        throw new Error("Failed to upload document. No envelope ID returned.");
      }
      if (!workspaceUuid) {
        throw new Error("No workspace UUID returned.");
      }

      const editUrl = `https://app.subnoto.com/envelopes/${workspaceUuid}/${result.envelopeUuid}/edit`;

      await showToast({
        style: Toast.Style.Success,
        title: "Document uploaded!",
        message: "Opening in browser...",
      });

      // Open the envelope edit page in the browser
      await open(editUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || workspacesLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="workspace"
        title="Workspace"
        storeValue
        info="The Subnoto workspace to upload the document to."
      >
        {workspaces.length === 0 && !workspacesLoading ? (
          <Form.Dropdown.Item value="" title="No workspaces (check API credentials)" />
        ) : (
          workspaces.map((w) => <Form.Dropdown.Item key={w.uuid} value={w.uuid} title={w.name} />)
        )}
      </Form.Dropdown>
      <Form.FilePicker
        id="file"
        title="Document"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles={true}
        info="Select a PDF or Word document (.pdf, .doc, .docx) to upload. Max size: 50 MB."
      />
      <Form.TextField
        id="title"
        title="Envelope Title"
        placeholder="Leave empty to use filename"
        info="The title for the envelope in Subnoto. Defaults to the filename if left empty."
      />
    </Form>
  );
}
