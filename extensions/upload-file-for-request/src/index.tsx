import { ActionPanel, Form, Action, Icon, openExtensionPreferences, Detail, LocalStorage } from "@raycast/api";
import { useState } from "react";
import { getFile, isImage, uploadFile } from "./common/util";
import { ImageMeta } from "./common/type";
import { ImageDetailMetadata } from "./common/image-detail-metadat";
import { imageMeta } from "image-meta";
type StateType = {
  status: "selecting" | "no-input" | "image-format-invalid" | "canceled" | "error" | "succeed";
  message: string;
  cache?: boolean;
  image?: ImageMeta;
};
export default function Command() {
  const [state, setState] = useState<StateType>({
    status: "selecting",
    message: "**uploading...**",
  });

  const submit = async (values: { file: string[]; file_name: string; sub_path: string }) => {
    const { file, file_name, sub_path } = values;
    if (file.length === 0) {
      setState({
        status: "error",
        message: "Input is not an image",
      });
      return;
    }
    const file_url = file[0];
    const { fileBuffer, fileName, fileExt, hash, type } = await getFile(file_url);

    const record = await LocalStorage.getItem<string>(hash);
    if (record) {
      const cacheImg = JSON.parse(record) as ImageMeta;
      setState({
        status: "succeed",
        message: isImage(cacheImg.format) ? `![Image Title](${cacheImg.url})` : `# The resource is not an image`,
        cache: true,
        image: cacheImg,
      });
      return;
    } else {
      const url = await uploadFile(fileBuffer, file_name != "" ? file_name : fileName, fileExt, sub_path);
      const newRecord: ImageMeta = {
        hash,
        from: "selected",
        source: file_url,
        format: type,
        url,
        size: fileBuffer.length,
        createdAt: Date.now(),
      };
      const isImg = isImage(type);
      if (isImg) {
        const meta = await imageMeta(fileBuffer);
        newRecord.width = meta.width;
        newRecord.height = meta.height;
      }

      await LocalStorage.setItem(hash, JSON.stringify(newRecord));

      setState({
        status: "succeed",
        cache: false,
        message: isImg ? `![Image Title](${url})` : "# The resource is not an image",
        image: newRecord,
      });
    }
  };
  const navigationTitle = state.status === "error" ? "Failed to upload" : "Uploaded successfully";
  if (state.status === "selecting") {
    return (
      <Form
        isLoading={true}
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Upload Now" onSubmit={submit} />
          </ActionPanel>
        }
      >
        <Form.FilePicker id="file" title="choose file" allowMultipleSelection={false} />
        <Form.TextField id="file_name" title="file name" />
        <Form.TextField id="sub_path" title="sub file path" defaultValue="assets/" placeholder="Should end with ‘/’" />
      </Form>
    );
  } else {
    return (
      <Detail
        markdown={state.message}
        navigationTitle={navigationTitle}
        metadata={state.status === "succeed" ? <ImageDetailMetadata image={state.image!} /> : null}
        actions={
          state.status === "succeed" ? (
            <ActionPanel>
              <Action.CopyToClipboard
                icon={Icon.CopyClipboard}
                title="Copy Image CDN URL to Clipboard"
                content={state.image!.url}
              />
              <Action.OpenInBrowser url={state.image!.url} />
              <Action.CopyToClipboard
                icon={Icon.CopyClipboard}
                title="Copy Markdown Content to Clipboard"
                content={`![image from clipboard](${state.image!.url})`}
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          ) : state.status === "error" ? (
            <ActionPanel>
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          ) : null
        }
      />
    );
  }
}
