import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState, useEffect } from "react";
import { uploadFile, getFileDomains } from "./lib/api";
import { getDefaultFileDomain } from "./lib/sdk";
import { addHistoryItem } from "./lib/history";
import { getShareableFileUrl } from "./lib/file-url";

import { readFileSync } from "fs";
import { basename } from "path";

function UploadFileCommand() {
  const [domain, setDomain] = useState("");

  const { data: domains, isLoading: domainsLoading } = usePromise(
    async () => (await getFileDomains()).data.domains,
  );

  useEffect(() => {
    if (!domains) return;
    getDefaultFileDomain().then((d) => {
      if (d && domains.includes(d)) setDomain(d);
      else if (domains.length > 0) setDomain(domains[0]);
    });
  }, [domains]);

  async function handleSubmit(values: {
    file: string[];
    custom_slug: string;
    is_private: boolean;
  }) {
    if (!values.file || values.file.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a file",
      });
      return;
    }

    const filePath = values.file[0];
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Uploading file...",
    });

    try {
      const fileBuffer = readFileSync(filePath);
      const fileName = basename(filePath);
      const blob = new Blob([new Uint8Array(fileBuffer)]);
      const formData = new FormData();
      formData.append("file", blob, fileName);
      if (domain) formData.append("domain", domain);
      if (values.custom_slug)
        formData.append("custom_slug", values.custom_slug);
      if (values.is_private) formData.append("is_private", "1");

      const res = await uploadFile(formData);

      const shortUrl = getShareableFileUrl(res.data, domain);
      await Clipboard.copy(shortUrl);
      await addHistoryItem({
        type: "file",
        title: fileName,
        url: shortUrl,
        domain: domain || new URL(shortUrl).hostname,
        slug: res.data.storename,
        hash: res.data.hash,
        fileUrl: res.data.url,
        createdAt: new Date().toISOString(),
      });

      toast.style = Toast.Style.Success;
      toast.title = "File uploaded";
      toast.message = `${shortUrl} copied to clipboard`;
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to upload file";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <Form
      isLoading={domainsLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="File" allowMultipleSelection={false} />
      <Form.Dropdown
        id="domain"
        title="Domain"
        value={domain}
        onChange={setDomain}
      >
        {domains?.map((d) => (
          <Form.Dropdown.Item key={d} value={d} title={d} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="custom_slug"
        title="Custom Slug"
        placeholder="Optional"
      />
      <Form.Checkbox
        id="is_private"
        title="Private"
        label="Make file private"
        defaultValue={false}
      />
    </Form>
  );
}

export default function UploadFile() {
  return <UploadFileCommand />;
}
