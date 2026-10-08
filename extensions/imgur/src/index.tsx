import fs from "node:fs";
import path from "node:path";

import { useEffect, useState } from "react";

import {
  Form,
  ActionPanel,
  Action,
  Icon,
  Toast,
  showToast,
  Clipboard,
  LocalStorage,
  open,
  getSelectedFinderItems,
  getPreferenceValues,
} from "@raycast/api";
import { ImgurClient } from "imgur";
import mime from "mime-types";

import { ALOWED_IMGUR_CONTENT_TYPES } from "@/common/constants";
import { StoreData, UploadResponse } from "@/types";

const { clientID } = getPreferenceValues();
const imgurClient = new ImgurClient({ clientId: clientID });

const saveHistory = async (type: "image" | "album", data: StoreData) => {
  const history = JSON.parse((await LocalStorage.getItem("history")) || "[]");

  history.unshift(data);

  return await LocalStorage.setItem(
    type === "image" || type === "album" ? "history" : "linkHistory",
    JSON.stringify(history),
  );
};

export default function CommandView() {
  const [albumTitle, setAlbumTitle] = useState<string>("");
  const [mediaPaths, _setMediaPaths] = useState<Array<string>>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  const setMediaPaths = (paths: Array<string> | ((values: Array<string>) => Array<string>)) => {
    const values = typeof paths === "function" ? paths(mediaPaths) : paths;

    _setMediaPaths(
      values.filter(
        (mediaPath) =>
          path.basename(mediaPath).includes(".") &&
          ALOWED_IMGUR_CONTENT_TYPES.find((item) => item === mime.lookup(path.basename(mediaPath))),
      ),
    );
  };

  /**
   * Load initial environment selected finder items
   */
  useEffect(() => {
    async function loadMediaItems() {
      try {
        const selectedFinderItem = await getSelectedFinderItems();

        setMediaPaths((paths) => [...paths, ...selectedFinderItem.map((item) => item.path)]);
      } catch {
        // Do nothing
      }
    }

    loadMediaItems();
  }, []);

  const uploadFile = async () => {
    if (uploading) return;

    if (!mediaPaths.length) {
      await showToast(Toast.Style.Failure, "No Media selected", "Please select an Media to upload");
      return;
    }

    const createAlbum = albumTitle.length || mediaPaths.length > 1;
    let album: Awaited<ReturnType<typeof imgurClient.createAlbum>>["data"] | undefined;

    setUploading(true);
    if (createAlbum) {
      const albumToast = await showToast(Toast.Style.Animated, "Creating Album", "Please wait...");

      try {
        const albumResponse = await imgurClient.createAlbum(albumTitle, "Uploaded from Raycast");

        if (!albumResponse.success) {
          throw Error("Failed to create album");
        }
        album = { ...albumResponse.data, link: `https://imgur.com/a/${albumResponse.data.id}` };
      } catch {
        albumToast.style = Toast.Style.Failure;
        albumToast.title = "Album create failed";
        albumToast.message = "Please try again";
        setUploading(false);
      }
    }

    const uploadToast = await showToast(Toast.Style.Animated, "Uploading", "Please wait...");
    const uploadedFiles: UploadResponse[] = [];

    for (const mediaPath of mediaPaths) {
      uploadToast.message = `${path.basename(mediaPath)}`;

      const stream = fs.createReadStream(mediaPath);
      const upload = await imgurClient.upload({
        ...(album && { album: album.deletehash }),
        type: "stream",
        image: stream as unknown as string | Buffer | ReadableStream,
      });

      if (!upload.success) {
        uploadToast.style = Toast.Style.Failure;
        uploadToast.title = "Upload failed";
        uploadToast.message = "Please try again";
        setUploading(false);
        return;
      }

      uploadedFiles.push({
        success: upload.success,
        id: upload.data.id,
        title: upload.data.title,
        type: upload.data.type,
        datetime: upload.data.datetime,
        width: upload.data.width,
        height: upload.data.height,
        size: upload.data.size,
        deletehash: upload.data.deletehash,
        link: upload.data.link,
      });
    }

    const link = album ? album.link : uploadedFiles[0].link;

    await Clipboard.copy(link);
    await saveHistory(
      createAlbum ? "album" : "image",
      createAlbum && album
        ? {
            album: {
              id: album.id,
              link: album.link,
              title: album.title ?? "",
              description: album.description ?? "",
              deletehash: album.deletehash,
            },
            images: uploadedFiles,
          }
        : uploadedFiles[0],
    );

    setUploading(false);

    uploadToast.style = Toast.Style.Success;
    uploadToast.title = "Upload successful";
    uploadToast.message = "Link copied to clipboard";

    uploadToast.primaryAction = {
      title: "Open in Browser",
      onAction: (toast) => {
        open(link);
        toast.hide();
      },
    };

    setAlbumTitle("");
    setMediaPaths([]);
  };

  return (
    <Form
      navigationTitle="Upload"
      enableDrafts
      isLoading={uploading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={() => uploadFile()} icon={Icon.Upload} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="albumName"
        title="Album Title"
        placeholder="Optional album title"
        autoFocus
        info="If selected only one file and no album title, image will uploaded without a album."
        value={albumTitle}
        onChange={setAlbumTitle}
      />
      <Form.FilePicker
        id="media"
        title="Media"
        info="Select an image or video to upload"
        allowMultipleSelection={true}
        value={mediaPaths}
        onChange={setMediaPaths}
        canChooseDirectories={false}
      />
    </Form>
  );
}
