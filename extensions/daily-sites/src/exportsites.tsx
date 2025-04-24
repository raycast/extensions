import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { Preferences } from "./types";
import { loadSites, sitesToXml } from "./utils";

interface ExportSitesFormProps {
  onDone: () => void;
}

export function ExportSitesForm({ onDone }: ExportSitesFormProps) {
  // read the xmlFolder preference
  const { xmlFolder } = getPreferenceValues<Preferences>();
  const [defaultDir] = useState<string>(xmlFolder || path.join(process.env.HOME || "", "Documents"));

  async function handleSubmit(values: { folder: string[]; filename: string }) {
    try {
      const sites = await loadSites();
      const xml = sitesToXml(sites);
      const out = path.join(values.folder[0], `${values.filename || "sites"}.xml`);
      fs.writeFileSync(out, xml, "utf8");
      await showToast(Toast.Style.Success, "Exported sites");
      onDone();
    } catch (e) {
      console.error(e);
      await showToast(Toast.Style.Failure, "Export failed");
    }
  }

  return (
    <Form
      navigationTitle="Export Sites"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Destination Folder"
        canChooseDirectories
        allowMultipleSelection={false}
        defaultValue={[defaultDir]}
      />
      <Form.TextField
        id="filename"
        title="Filename"
        defaultValue="dailysites"
        placeholder="dailysites"
        info="Your exported file will be saved with a .xml extension"
      />
    </Form>
  );
}

export default function ExportSitesCommand() {
  return <ExportSitesForm onDone={() => {}} />;
}
