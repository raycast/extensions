import React from "react";
import { Action, ActionPanel, Clipboard, Form, Grid, Icon, LocalStorage, showToast, Toast } from "@raycast/api";
import fs from "fs";
import os from "os";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { temporaryWrite, FileOptions } from "tempy";
import path from "path";

cloudinary.config({
  cloud_name: "dxhjeyzad",
  api_key: "991329827415615",
  api_secret: "BVqKXefDh_3mTu00xvX7lwQRa5s",
  secure: true,
});

type StoredItem = {
  [key: string]: string;
};

export default function Command() {
  const [storedItems, setStoredItems] = React.useState<StoredItem>({});

  async function getStoredItems() {
    const items = await LocalStorage.allItems();
    setStoredItems(items);
  }

  React.useEffect(() => {
    getStoredItems();
  }, []);

  return (
    <Grid>
      <Grid.Section title="Restore Photo" inset={Grid.Inset.Large}>
        <Grid.Item
          content={Icon.Upload}
          title="Upload Photo"
          actions={
            <ActionPanel>
              <Action.Push title="Upload Photo" target={<UploadForm onSubmit={() => getStoredItems()} />} />
            </ActionPanel>
          }
        />
      </Grid.Section>

      <Grid.Section title="Previously Restored">
        {Object.entries(storedItems).map(([name, url]) => (
          <Grid.Item key={name} content={url} title={name} actions={<SharedActions image={url} name={name} />} />
        ))}
      </Grid.Section>
    </Grid>
  );
}

type OriginalPhoto = {
  name: string;
  path: string;
  url?: string;
};

function UploadForm({ onSubmit }: { onSubmit: () => void }) {
  const [originalPhoto, setOriginalPhoto] = React.useState<OriginalPhoto>({
    name: "",
    path: "",
    url: "",
  });
  const [restoredPhotoUrl, setPhotoImageUrl] = React.useState("");

  React.useEffect(() => {
    async function addStoredItem() {
      await LocalStorage.setItem(`${originalPhoto.name}`, restoredPhotoUrl);
      onSubmit();
    }

    if (restoredPhotoUrl && originalPhoto.name) {
      addStoredItem();
    }
  }, [restoredPhotoUrl, originalPhoto.name]);

  const onFileSelected = async (filePath: string) => {
    if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
      return false;
    }

    const toast = await showToast(Toast.Style.Animated, "Restoring photo…");

    const fileName = path.basename(filePath);

    setOriginalPhoto({
      path: filePath,
      name: fileName,
    });

    cloudinary.uploader
      .upload(filePath, { resource_type: "image", folder: "restore-photos-raycast", use_filename: true })
      .then((result) => generatePhoto(result.secure_url, toast));
  };

  async function generatePhoto(fileUrl: string, toast: Toast) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data, status } = await axios({
      method: "post",
      url: "https://www.restorephotos.io/api/generate",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({ imageUrl: fileUrl }),
    });

    if (status !== 200) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error restoring photo",
        message: "There's been an error restoring your photo. Please try again later.",
      });
    } else {
      setPhotoImageUrl(data);
    }

    toast.style = Toast.Style.Success;
    toast.title = "Photo restored 🎉";
  }

  if (restoredPhotoUrl) {
    return (
      <Grid columns={2}>
        <Grid.Section>
          <Grid.Item
            content={restoredPhotoUrl}
            title="Restored Photo"
            actions={<SharedActions image={restoredPhotoUrl} name={originalPhoto.name} />}
          />
        </Grid.Section>
      </Grid>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload Photo"
            onSubmit={(values: { originalPhoto: string[] }) => {
              const file = values.originalPhoto[0];
              onFileSelected(file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="About"
        text="Use this form to restore old photos using AI. Pick an image and upload. Powered by https://restorephotos.io."
      />

      <Form.Separator />

      <Form.FilePicker id="originalPhoto" allowMultipleSelection={false} title="Image" />
    </Form>
  );
}

function SharedActions({ image, name }: { image: string; name: string }) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={image} />
      <Action title="Download Photo" icon={Icon.Download} onAction={() => downloadFileAction(image, name)} />
      <Action.CopyToClipboard title="Copy URL" content={image} />
      <Action title="Copy Photo" icon={Icon.CopyClipboard} onAction={() => copyFileAction(image, name)} />
    </ActionPanel>
  );
}

async function copyFileToClipboard(url: string, name?: string) {
  const file = await downloadTempFile(url, name);

  try {
    await Clipboard.copy({ file });
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to copy image: "${error.message}"`);
  }

  return path.basename(file);
}

async function downloadFileToDesktop(url: string, name?: string) {
  const file = await downloadTempFile(url, name);
  const desktopDir = path.join(os.homedir(), "Desktop");

  const extension = path.extname(file);
  const baseName = path.basename(file, extension);

  fs.rename(file, `${desktopDir}/${baseName}-restored${extension}`, function (error) {
    if (error) throw error;
  });

  return true;
}

async function downloadTempFile(url: string, name?: string) {
  const { status, data } = await axios(url, { responseType: "arraybuffer" });

  if (status !== 200) {
    throw new Error(`File download failed. Server responded with ${status}`);
  }

  if (data === null) {
    throw new Error("Unable to read image response");
  }

  let tempyOpt: FileOptions;
  if (name) {
    tempyOpt = { name };
  } else {
    tempyOpt = { extension: ".png" };
  }

  let file: string;
  try {
    file = await temporaryWrite(data, tempyOpt);
  } catch (e) {
    const error = e as Error;
    throw new Error(`Failed to download image: "${error.message}"`);
  }

  return file;
}

function copyFileAction(url: string, name?: string) {
  showToast({
    style: Toast.Style.Animated,
    title: "Copying…",
  })
    .then(() => {
      return copyFileToClipboard(url, name).then(() => {
        return showToast({
          style: Toast.Style.Success,
          title: "Copied image to clipboard",
        });
      });
    })
    .catch((e: Error) =>
      showToast({
        style: Toast.Style.Failure,
        title: "Error, please try again",
        message: e?.message,
        primaryAction: {
          title: "Copy Error Message",
          onAction: (toast) => Clipboard.copy(toast.message ?? ""),
          shortcut: { modifiers: ["cmd"], key: "c" },
        },
      })
    );
}

function downloadFileAction(url: string, name: string) {
  showToast({
    style: Toast.Style.Animated,
    title: "Downloading…",
  })
    .then(async () => {
      return downloadFileToDesktop(url, name).then(() => {
        return showToast({
          style: Toast.Style.Success,
          title: "Downloaded to Desktop",
        });
      });
    })
    .catch((e: Error) =>
      showToast({
        style: Toast.Style.Failure,
        title: "Error, please try again",
        message: e?.message,
        primaryAction: {
          title: "Copy Error Message",
          onAction: (toast) => Clipboard.copy(toast.message ?? ""),
          shortcut: { modifiers: ["cmd"], key: "c" },
        },
      })
    );
}
