import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import fs from "fs";
import path from "path";
import type { Preferences } from "./types";
import { loadSites, sitesToXml } from "./utils";

export function ExportSitesForm({ onDone }: { onDone: () => void }) {
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
    } catch (error) {
      console.error(error);
      await showFailureToast(error, { title: "Could not export sites" });
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
  // Command entrypoint – supplies a no-op onDone so the form always gets it
  return <ExportSitesForm onDone={() => {}} />;
}
