import { Form, ActionPanel, Action, Icon, Toast, showToast, Clipboard, LocalStorage } from "@raycast/api";
import fs from "fs";
import { useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import { lookup } from "mime-types";
import formData from "form-data";
import axios from "axios";

const { clientID } = getPreferenceValues();

const saveHistory = async (type: string, data: UploadResponse) => {
  if (type !== "image") return;
  const history = JSON.parse((await LocalStorage.getItem("history")) || "[]");

  history.unshift(data);

  return await LocalStorage.setItem(type === "image" ? "history" : "linkHistory", JSON.stringify(history));
};

export interface UploadResponse {
  success: any;
  id: string;
  title: string;
  type: string;
  datetime: number;
  width: number;
  height: number;
  size: number;
  deletehash: string;
  link: string;
}

export default function Command() {
  const [media, setMedia] = useState<Array<any>>([]);

  const uploadFile = async (media: Array<any>) => {
    if (!media.length) {
      await showToast(Toast.Style.Failure, "No Media selected", "Please select an Media to upload");
      return;
    }

    // Media path
    const path = media[0];
    // File name
    const fileName = path.split("/").pop();
    // determine the mime type
    const mimeType = lookup(path).toString().split("/")[0];

    // check if the mime type is not image or video
    if (mimeType !== "image" && mimeType !== "video") {
      await showToast(Toast.Style.Failure, "Invalid Media", "Please select an image or video to upload");
      return;
    }

    const type = mimeType === "image" ? "image" : "video";
    // create a form data
    const data = new formData();
    data.append(type, fs.createReadStream(path));
    data.append("title", fileName);

    // configure axios
    const config = {
      method: "post",
      url: "https://api.imgur.com/3/upload",
      headers: {
        Authorization: `Client-ID ${clientID}`,
        ...data.getHeaders(),
      },
      data: data,
    };

    try {
      showToast(Toast.Style.Animated, "Uploading", "Please wait...");
      const response = await axios(config);

      if (!response.data.success) {
        showToast(Toast.Style.Failure, "Upload failed", "Please try again");
        return;
      }

      const data = response.data.data as UploadResponse;
      await Clipboard.copy(data.link);
      await saveHistory(type, data);
      showToast(Toast.Style.Success, "Upload successful", "Link copied to clipboard");
      setMedia([]);
    } catch (error) {
      showToast(Toast.Style.Failure, "Upload failed", "Please try again");
      console.log(error);
    }
  };

  return (
    <Form
      navigationTitle="Upload"
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={({ media }) => uploadFile(media)} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="media"
        value={media}
        onChange={setMedia}
        title="Media"
        autoFocus
        info="Select an image or video to upload"
        allowMultipleSelection={false}
      />
    </Form>
  );
}
