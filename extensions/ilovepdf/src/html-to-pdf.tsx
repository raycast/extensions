import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getPreferenceValues,
  Toast,
  openExtensionPreferences,
} from "@raycast/api";
import ILovePDFApi from "@ilovepdf/ilovepdf-nodejs";
import HtmlPdfTask from "@ilovepdf/ilovepdf-js-core/tasks/HtmlPdfTask";
import { useState } from "react";
import fs from "fs";
import path from "path";
import { chooseDownloadLocation, getErrorMessage, getFilePath, handleOpenNow } from "./common/utils";
import { Status } from "./common/types";
import os from "os";

const {
  APIPublicKey: publicKey,
  APISecretKey: secretKey,
  OpenNow: openNow,
  AskBeforeDownload: askBeforeDownload,
} = getPreferenceValues<Preferences>();

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<Status>("init");
  const [destinationFilePath, setDestinationFilePath] = useState<string>("");
  const [pageLink, setPageLink] = useState<string>("");
  async function handleSubmit() {
    setIsLoading(true);

    const toast = await showToast(Toast.Style.Animated, "Processing", "Converting HTML...");
    let destinationFile = getFilePath(path.join(os.homedir(), "Downloads"), `converted_page.pdf`);
    if (askBeforeDownload) {
      const finalName = await chooseDownloadLocation(
        destinationFile,
        "Save The PDF As",
        setIsLoading,
        setStatus,
        toast,
      );
      if (finalName == undefined) {
        return;
      }
      destinationFile = finalName;
    }

    setDestinationFilePath(destinationFile);
    const instance = new ILovePDFApi(publicKey, secretKey);
    const task = instance.newTask("htmlpdf") as HtmlPdfTask;
    try {
      await task.start();
      await task.addFile(pageLink);
      await task.process();
      const data = await task.download();
      fs.writeFileSync(destinationFile, data);
      toast.style = Toast.Style.Success;
      toast.title = "success";
      toast.message = "Page converted successfully.";
      setStatus("success");
      setIsLoading(false);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "failure";
      toast.message = `Error happened during converting to PDF. Reason ${getErrorMessage(error)}`;
      setStatus("failure");
      setIsLoading(false);
      return;
    }

    await handleOpenNow(openNow, destinationFile, toast);
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to PDF" onSubmit={handleSubmit} />
          {status == "success" ? <Action.ShowInFinder title="Show in Finder" path={destinationFilePath} /> : null}
          {status == "success" ? (
            <Action.CopyToClipboard title="Copy Path to Clipboard" content={destinationFilePath} />
          ) : null}
          {status == "failure" ? (
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          ) : null}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextArea
        id="link"
        title={"Page Link"}
        value={pageLink}
        onChange={setPageLink}
        placeholder="Example: https://www.ilovepdf.com"
      />
    </Form>
  );
}
