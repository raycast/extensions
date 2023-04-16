import { ActionPanel, Form, Action } from "@raycast/api"; 
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { useState } from "react";

export default function Command() {
  const [additionalInfo, setAdditionalInfo] = useState("");

  const onSubmit = async (values: { name: string }) => {
    const desktopDir = path.join(os.homedir(), "Desktop");
    const folderPath = path.join(desktopDir, values.name);

    if (fs.existsSync(folderPath)) {
      setAdditionalInfo(`Folder "${values.name}" already exists on desktop.`);
      return;
    }

    setAdditionalInfo("Creating folder...");

    fs.mkdirSync(folderPath);
    setAdditionalInfo(`Folder "${values.name}" created on desktop.`);

    const htmlTitle = `${values.name}`;
    const indexHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="style.css"><title>${htmlTitle}</title></head><body><h1>${htmlTitle}</h1><script src="./script.js"></script></body></html>`;
    const indexHtmlPath = path.join(folderPath, "index.html");
    const styleCssPath = path.join(folderPath, "style.css");
    const scriptJsPath = path.join(folderPath, "script.js");

    setAdditionalInfo("Adding files to folder...");

    setTimeout(() => {
      fs.writeFileSync(indexHtmlPath, indexHtml);
      setAdditionalInfo(`Added index.html to folder "${values.name}".`);
    }, 500);

    setTimeout(() => {
      fs.writeFileSync(styleCssPath, "");
      setAdditionalInfo(`Added style.css to folder "${values.name}".`);
    }, 1000);

    setTimeout(() => {
      fs.writeFileSync(scriptJsPath, "");
      setAdditionalInfo(`Added script.js to folder "${values.name}".`);
    }, 1500);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Folder" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        defaultValue=""
        placeholder="Folder1"
        title="Folder Name:"
      />
      <Form.Separator />
      <Form.Description
        title="Additional Information:"
        text={additionalInfo}
      />
    </Form>
  );
}