import {
  Form,
  ActionPanel,
  Action,
  Toast,
  Icon,
  Keyboard,
  Clipboard,
  showToast,
} from "@raycast/api";
import Axios from "axios";
import { useState } from "react";
import { createWriteStream } from "fs";
import { homedir } from "os";
import { existsSync, lstatSync } from "fs";

type FormValues = {
  VideoURL: string;
  ProvidedByExtension?: boolean;
};

export default function Command() {
  const [DownloadsFolder, SetDownloadsFolder] = useState<string>(homedir() + "/Downloads");
  const [Filename, SetFilename] = useState<string>("");
  const [IsDownloadComplete, SetIsDownloadComplete] = useState<boolean>(false);
  const [ClipboardContent, SetClipboardContent] = useState<Clipboard.Content | string>("");
  const [TextField, SetTextField] = useState<string>("");

  async function checkClipboardValue() {
    const ClipboardText = await Clipboard.readText();
    if (ClipboardText && ClipboardText.includes("x.com") && ClipboardText.split("/").length > 4)
      handleSubmit({ VideoURL: ClipboardText || "", ProvidedByExtension: true });
  }

  function handleSubmit(Values: FormValues) {
    try {
      if (Values.ProvidedByExtension) return SetTextField(Values.VideoURL);
      const [Username, TweetID] = [TextField.split("/")[3], TextField.split("/")[5]];
      if (!Username || !TweetID) throw new Error("Invalid URL");

      SetFilename(`${TweetID}.mp4`);

      handleDownload(Username, TweetID);
    } catch {
      showToast({
        title: "Invalid URL",
        message: "Please enter a valid Twitter video URL",
        style: Toast.Style.Failure,
      });
    }
  }

  async function handleDownload(username: string, TweetID: string) {
    const Writer = createWriteStream(`${DownloadsFolder}/${TweetID}.mp4`);
    const APIResponse = await Axios(`https://api.vxtwitter.com/${username}/status/${TweetID}`);
    const DirectURL = APIResponse.data.media_extended[0]?.url;
    if (!DirectURL)
      return showToast({
        title: "Error",
        message: "No video found",
        style: Toast.Style.Failure,
      });
    const ProgressToast = await showToast({
      title: "Downloading Video, Please Wait",
      style: Toast.Style.Animated,
    });
    Axios.get(DirectURL, {
      responseType: "stream",
      onDownloadProgress: (Event) =>
        (ProgressToast.message = Math.round(Event.progress! * 100) + "%"),
    })
      .then((Response) => {
        Response.data.pipe(Writer);
        Writer.on("finish", async () => {
          showToast({
            title: "Download Complete",
          });
          SetClipboardContent({ file: `${DownloadsFolder}/${TweetID}.mp4` });
          SetIsDownloadComplete(true);
        }).on("error", () => {
          showToast({
            title: "Error While Downloading Video",
            style: Toast.Style.Failure,
          });
        });
      })
      .catch(() => {
        showToast({
          title: "Error While Fetching Video",
          style: Toast.Style.Failure,
        });
      });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Download} title="Download Video" onSubmit={handleSubmit} />
          <Action.SubmitForm
            icon={Icon.Finder}
            title="Change Download Folder"
            onSubmit={async (values: { downloadFolder: string[] }) => {
              const folder = values.downloadFolder[0];
              if (!existsSync(folder) || lstatSync(folder).isFile()) {
                await showToast({
                  title: "Invalid Folder",
                  style: Toast.Style.Failure,
                });
                return false;
              }
              if (folder === DownloadsFolder) return false;
              SetDownloadsFolder(folder);
              await showToast({
                title: "Download Folder Updated",
              });
            }}
          />
          <Action.ShowInFinder
            icon={Icon.Folder}
            title="Open Downloads Folder"
            path={DownloadsFolder}
            shortcut={Keyboard.Shortcut.Common.Duplicate}
          />
          {IsDownloadComplete && (
            <Action.Open
              icon={Icon.Video}
              title="Open the Video"
              target={`${DownloadsFolder}/${Filename}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          )}
          {IsDownloadComplete && (
            <Action.CopyToClipboard
              icon={Icon.Clipboard}
              title="Copy Video to Clipboard"
              content={ClipboardContent}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Description text="You can use user actions menu for various actions after the download is complete. If you have a valid Twitter URL in your clipboard when you click the command it will be automatically catched by extension." />
      <Form.TextField
        id="videoURL"
        title="Video URL"
        placeholder="Enter video URL"
        onFocus={checkClipboardValue}
        onChange={SetTextField}
        value={TextField}
        autoFocus
      />
      <Form.Separator />
      <Form.FilePicker
        defaultValue={[DownloadsFolder]}
        id="downloadFolder"
        title="Download Folder"
        canChooseDirectories
        storeValue
        allowMultipleSelection={false}
        canChooseFiles={false}
      />
    </Form>
  );
}
