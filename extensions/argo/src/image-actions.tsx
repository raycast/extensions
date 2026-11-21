import { Action, Form, Icon, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getImage, importImage, releaseImage, type LocalImage } from "./images.js";

type ImageDraft = {
  imageId?: string;
  changeImage: (imageId?: string) => void | Promise<void>;
};

export function ImageAccessory(props: ImageDraft) {
  const controls = useImageControls(props);
  const [revision, setRevision] = useState(0);
  return (
    <List.Dropdown
      key={revision}
      tooltip="Image attached · Remove, preview or change image"
      value="attached"
      storeValue={false}
      onChange={async (value) => {
        if (value === "attached") return;
        // Restore the attachment label even if removal is refused or a preview opens another app.
        setRevision((previous) => previous + 1);
        if (value === "remove") await controls.remove();
        else if (value === "preview") await controls.preview();
        else if (value === "change") controls.choose();
      }}
    >
      <List.Dropdown.Item value="attached" title="Image attached" icon={Icon.Image} />
      <List.Dropdown.Item value="remove" title="Remove Image" icon={Icon.Trash} />
      <List.Dropdown.Item value="preview" title="Preview Image" icon={Icon.Eye} />
      <List.Dropdown.Item value="change" title="Change Image" icon={Icon.Image} />
    </List.Dropdown>
  );
}

function useImageControls({ imageId, changeImage }: ImageDraft) {
  const { push } = useNavigation();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function preview() {
    try {
      if (!imageId) return;
      const image = await getImage(imageId);
      if (mounted.current) await open(image.path);
    } catch (cause) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Preview Image", message: String(cause) });
    }
  }
  async function remove() {
    if (!imageId || lock.current || !mounted.current) return;
    lock.current = true;
    try {
      await changeImage(undefined);
      await releaseImage(imageId).catch(() => {});
    } catch (cause) {
      await showToast({ style: Toast.Style.Failure, title: "Image Kept", message: String(cause) });
    } finally {
      lock.current = false;
    }
  }
  function choose() {
    if (!lock.current && mounted.current) push(<ImagePicker imageId={imageId} changeImage={changeImage} />);
  }
  return { preview, remove, choose };
}

export function ImageActions(props: ImageDraft) {
  const controls = useImageControls(props);
  return (
    <>
      <Action title={props.imageId ? "Change Image" : "Attach Image"} icon={Icon.Image} onAction={controls.choose} />
      {props.imageId ? <Action title="Preview Image" icon={Icon.Eye} onAction={controls.preview} /> : null}
      {props.imageId ? <Action title="Remove Image" icon={Icon.Trash} onAction={controls.remove} /> : null}
    </>
  );
}

export function ImagePicker({ imageId, changeImage }: ImageDraft) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function select(paths: string[]) {
    if (!paths[0] || lock.current || !mounted.current) return;
    lock.current = true;
    setBusy(true);
    let image: LocalImage | undefined;
    let saved = false;
    try {
      image = await importImage(paths[0]);
      if (!mounted.current) return;
      await changeImage(image.id);
      saved = true;
      if (imageId && imageId !== image.id) await releaseImage(imageId).catch(() => {});
      if (mounted.current) pop();
    } catch (cause) {
      if (mounted.current)
        setError(cause instanceof Error ? cause.message : "Could not attach the image. Your draft is kept.");
    } finally {
      if (image && !saved) await releaseImage(image.id).catch(() => {});
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Form navigationTitle={imageId ? "Change Image" : "Attach Image"} isLoading={busy} enableDrafts={false}>
      <Form.Description text="Choose one PNG, JPEG or WebP up to 4 MiB. Your comment stays in the conversation. Nothing sends automatically." />
      <Form.FilePicker
        id="image"
        title="Image"
        value={[]}
        canChooseDirectories={false}
        allowMultipleSelection={false}
        onChange={(paths) => {
          void select(paths);
        }}
        error={error}
      />
    </Form>
  );
}
