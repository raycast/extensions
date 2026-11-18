import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getImage } from "./images.js";
import { ImageActions } from "./image-actions.js";

export function Compose({
  text,
  change,
  send,
  imageId,
  changeImage,
  imageUnavailable,
  description = "Your draft is saved on this Mac as you type. Nothing sends automatically, including after reconnecting. Send submits to the hub queue only when the Agent is online; a busy Agent receives it after the current turn.",
  title = "Compose Message",
  submitTitle = "Send Message",
}: {
  text: string;
  change: (text: string) => void;
  send: (text: string, imageId?: string) => Promise<boolean>;
  imageId?: string;
  changeImage?: (imageId?: string) => void | Promise<void>;
  imageUnavailable?: string;
  description?: string;
  title?: string;
  submitTitle?: string;
}) {
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(Boolean(imageId));
  const [selectedId, setSelectedId] = useState(imageId);
  const [error, setError] = useState<string>();
  const lock = useRef(Boolean(imageId));
  const mounted = useRef(true);
  const { pop } = useNavigation();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    lock.current = true;
    setBusy(true);
    void getImage(selectedId)
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load the image. Your draft is kept.");
      })
      .finally(() => {
        if (active) {
          lock.current = false;
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedId]);
  async function select(nextId?: string) {
    if (!changeImage || lock.current || !mounted.current)
      throw new Error("The composer is busy or closed. Your previous image is kept.");
    lock.current = true;
    setBusy(true);
    try {
      await changeImage(nextId);
      if (mounted.current) {
        setSelectedId(nextId);
        setError(undefined);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle={title}
      isLoading={busy}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.ArrowUp}
            onSubmit={async () => {
              if (lock.current || !mounted.current) return;
              if (selectedId && (error || imageUnavailable)) {
                setError(error || imageUnavailable);
                return;
              }
              lock.current = true;
              setBusy(true);
              try {
                if ((await send(value, selectedId)) && mounted.current) pop();
              } finally {
                lock.current = false;
                if (mounted.current) setBusy(false);
              }
            }}
          />
          {changeImage ? <ImageActions imageId={selectedId} changeImage={select} /> : null}
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.TextArea
        id="text"
        title="Message"
        value={value}
        onChange={(next) => {
          setValue(next);
          change(next);
        }}
        error={value.length > 100_000 ? "Maximum 100,000 characters" : undefined}
        autoFocus
      />
      {selectedId ? (
        <Form.Description title="Image" text="Image attached · Preview, change or remove it in Actions" />
      ) : null}
      {error ? <Form.Description title="Image Error" text={error} /> : null}
      {imageUnavailable ? <Form.Description title="Image Availability" text={imageUnavailable} /> : null}
    </Form>
  );
}
