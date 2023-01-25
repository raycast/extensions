import { List, Icon, Clipboard, Toast, Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import formData from "form-data";
import fs from "fs";
import rfs from "recursive-fs";
import basePathConverter from "base-path-converter";

interface Preferences {
  PINATA_JWT: string;
  SUBMARINE_KEY: string;
  GATEWAY: string;
}

const preferences = getPreferenceValues<Preferences>();
const SUBMARINE_KEY = preferences.SUBMARINE_KEY;
const JWT = `Bearer ${preferences.PINATA_JWT}`;

type values = {
  file: string[];
  name: string;
};

function UploadFolder({ loading, setLoading }) {
  async function handleSubmit(values: { folder: string[]; name: string; submarine: boolean }) {
    if (!values.folder[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a folder!",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading Folder..." });
    setLoading(true);

    try {
      const data = new formData();

      const { dirs, files } = await rfs.read(values.folder[0]);
      for (const file of files) {
        data.append(`file`, fs.createReadStream(file), {
          filepath: basePathConverter(values.folder[0], file),
        });
      }
      if (!values.submarine) {
        const metadata = JSON.stringify({
          name: values.name ? values.name : "file from Raycast",
        });
        data.append("pinataMetadata", metadata);

        const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data, {
          maxBodyLength: Infinity,
          headers: {
            "Content-Type": `multipart/form-data;`,
            Authorization: JWT,
          },
        });
        const resObject = res.data;
        const hash = resObject.IpfsHash;
        await Clipboard.copy(hash);

        toast.style = Toast.Style.Success;
        toast.title = "Folder Uploaded!";
        toast.message = String("CID copied to clipboard");
        setLoading(false);
      } else {
        data.append("name", values.name ? values.name : "File from Raycast");
        data.append("pinToIPFS", "false");
        const subRes = await axios.post("https://managed.mypinata.cloud/api/v1/content", data, {
          headers: {
            "x-api-key": SUBMARINE_KEY,
            ...data.getHeaders(),
          },
        });
        const subItem = subRes.data.items[0];
        const subHash = subItem.cid;
        await Clipboard.copy(subHash);
        toast.style = Toast.Style.Success;
        toast.title = "Folder Uploaded!";
        toast.message = String("CID copied to clipboard");
        setLoading(false);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed Uploading Folder";
      toast.message = String(error);
      setLoading(false);
      console.log(error);
    }
  }
  return <Action.SubmitForm title="Upload Folder" onSubmit={handleSubmit} icon={Icon.Upload} />;
}

export default function Command() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <List>
        <List.EmptyView
          icon={{ source: "loading/loading.gif" }}
          title="Uploading Your File"
          description="This could take a while depending on your folder size and internet connection"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <UploadFolder loading={loading} setLoading={setLoading} />
            </ActionPanel>
          }
        >
          <Form.Description text="Upload a Folder to Pinata!" />
          <Form.FilePicker id="folder" allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
          <Form.TextField id="name" title="Name" placeholder="Choose the name for your folder" />
          {/* <Form.Checkbox id="submarine" label="Submarine File" defaultValue={false} / */}
          <Form.Separator />
        </Form>
      )}
    </>
  );
}
