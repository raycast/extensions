import { Clipboard, getPreferenceValues, showToast, Toast, open, showHUD } from "@raycast/api";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Gyazo from "gyazo-api";

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
  const client = new Gyazo(accessToken);
  const response = await client.upload(image);
  const data: GyazoResponse = response.data;

  // アップロードした画像へのダイレクトリンクをクリップボードへコピーする
  const directLink = data.url;
  await Clipboard.copy(directLink);

  await showHUD("Successfully Uploaded");
};
