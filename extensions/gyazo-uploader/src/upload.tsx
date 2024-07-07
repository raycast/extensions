import { Clipboard, getPreferenceValues, showToast, Toast, open, showHUD } from "@raycast/api";
import fs from "fs";
import FormData from "form-data";
import axios from "axios";

interface Preferences {
  accessToken: string;
}

interface GyazoResponse {
  type: string;
  thumb_url: string;
  created_at: string; // UTC string
  image_id: string;
  permalink_url: string;
  url: string;
}

export default async () => {
  const { accessToken } = getPreferenceValues<Preferences>();

  const { file } = await Clipboard.read();

  if (typeof file === "undefined") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Clipboard is not an image",
      primaryAction: {
        title: "Open Clipboard History",
        onAction: async (toast) => {
          await open("raycast://extensions/raycast/clipboard-history/clipboard-history");
          toast.hide();
        },
      },
    } satisfies Toast.Options);
    return;
  }

  // gyazo clientを使って画像をアップロードする
  const fileUrl = new URL(file);
  const image = fs.createReadStream(fileUrl);
  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("imagedata", image);
  const response = await axios.post("https://upload.gyazo.com/api/upload", form, {
    headers: form.getHeaders(),
  });

  const data: GyazoResponse = response.data;

  // アップロードした画像へのダイレクトリンクをクリップボードへコピーする
  const directLink = data.url;
  await Clipboard.copy(directLink);

  await showHUD("Successfully Uploaded");
};
