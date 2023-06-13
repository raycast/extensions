import { List, Icon, Clipboard, Toast, Form, ActionPanel, Action, showToast, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import axios from "axios";
import formData from "form-data";
import fs from "fs";

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

function UploadFile({ loading, setLoading }) {
  async function handleSubmit(values: { file: string[]; name: string; submarine: boolean }) {
    if (!values.file[0]) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please select a file!",
      });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading File..." });
    setLoading(true);

    try {
      const data = new formData();

      const file = fs.createReadStream(values.file[0]);

      if (!values.submarine) {
        data.append("file", file);
        const metadata = JSON.stringify({
          name: values.name ? values.name : "File uploaded from Raycast",
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
        toast.title = "File Uploaded!";
        toast.message = String("CID copied to clipboard");
        setLoading(false);
      } else {
        data.append("files", file);
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
        toast.title = "File Uploaded!";
        toast.message = String("CID copied to clipboard");
        setLoading(false);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed Uploading File";
      toast.message = String(error);
      setLoading(false);
      console.log(error);
    }
  }
  return <Action.SubmitForm title="Upload File" onSubmit={handleSubmit} icon={Icon.Upload} />;
}

export default function Command() {
  const [loading, setLoading] = useState(false);

  return (
    <>
      <List>
        <List.EmptyView
          icon={{ source: "loading/loading.gif" }}
          title="Uploading Your File"
          description="This could take a while depending on your file size and internet connection"
        />
      </List>
      {!loading && (
        <Form
          actions={
            <ActionPanel>
              <UploadFile loading={loading} setLoading={setLoading} />
            </ActionPanel>
          }
        >
          <Form.Description text="Upload a file to Pinata!" />
          <Form.FilePicker id="file" allowMultipleSelection={false} />
          <Form.TextField id="name" title="Name" placeholder="Choose the name for your file" />
          <Form.Checkbox id="submarine" label="Submarine File" defaultValue={false} />
          <Form.Separator />
        </Form>
      )}
    </>
  );
}
