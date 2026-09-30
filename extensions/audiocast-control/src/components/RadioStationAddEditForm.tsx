import { Action, ActionPanel, Form, showHUD, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { add, edit, type Radio } from "../lib/radioDB";
import { useRadioMetadata } from "../hooks/useRadioMetadata";
import { createLog } from "../lib/debug";
import { playUrl } from "../api/player";
import { usePlayerUrl } from "../hooks/usePlayerUrl";

const log = createLog("RadioStationAddEditForm");

interface RadioStationAddEditFormProps {
  radio?: Radio;
  onSubmitSuccess: () => void;
}

interface SubmitFormValues {
  url?: string;
  title: string;
  description: string;
}

export function RadioStationAddEditForm({ radio, onSubmitSuccess }: RadioStationAddEditFormProps) {
  const isEdit = !!radio;
  const { pop } = useNavigation();
  const { data: playerUrl } = usePlayerUrl();
  const [url, setUrl] = useState<string>(radio?.url || "");
  const [title, setTitle] = useState<string>(radio?.title || "");
  const [description, setDescription] = useState<string>(radio?.description || "");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);
  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const { data: radioMetaData, isLoading: isRadioMetadataLoading } = useRadioMetadata(!isEdit ? url : null);
  const submitActionTitle = isEdit ? "Update Radio" : "Add Radio";
  const submitAndPlayActionTitle = isEdit ? "Update Radio and Play" : "Add Radio and Play";

  useEffect(() => {
    if (URL.canParse(url)) {
      setUrlError(undefined);
    } else {
      setUrlError("Invalid URL");
    }
  }, [url]);
  const onSubmit = useCallback(async ({ url, title, description }: SubmitFormValues) => {
    if (!url && !isEdit) {
      setUrlError("URL is required");
    }

    if (!title) {
      setTitleError("Title is required");
    }

    if ((!url && !isEdit) || !title) {
      return;
    }

    setUrlError(undefined);
    setTitleError(undefined);

    try {
      if (radio) {
        log.log(`Editing radio station: ${title}`);

        await edit(radio.id, title, description);
      } else {
        log.log(`Adding radio station: ${title}`);

        await add(url!, title, description);
      }

      showHUD(`"${title}" radio was ${isEdit ? "updated" : "added"}`);

      onSubmitSuccess?.();
      pop();

      return true;
    } catch (error) {
      log.error(`Failed to ${isEdit ? "edit" : "add"} radio station "${title}": ${error}`);
      showHUD(`Failed to ${isEdit ? "edit" : "add"} "${title}" radio station to your favorite`);

      return false;
    }
  }, []);
  const onSubmitAndPlay = useCallback(
    async (values: SubmitFormValues) => {
      const result = await onSubmit(values);
      const radioUrl = values?.url || radio?.url || undefined;

      log.log("[onSubmitAndPlay]", { playerUrl, result, radioUrl });

      if (!!playerUrl && result === true && !!radioUrl) {
        playUrl(playerUrl, radioUrl);
      }
    },
    [playerUrl, radio?.url],
  );

  useEffect(() => {
    log.log(`[radioMetaData effect] recieved radio data:`, radioMetaData);

    if (radioMetaData?.title) {
      setTitle(radioMetaData.title);
    }

    if (radioMetaData?.description) {
      setDescription(radioMetaData.description);
    }
  }, [radioMetaData]);

  return (
    <Form
      isLoading={isRadioMetadataLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitActionTitle} onSubmit={onSubmit} />
          <Action.SubmitForm
            title={submitAndPlayActionTitle}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "enter" },
              Windows: { modifiers: ["ctrl", "shift"], key: "enter" },
            }}
            onSubmit={onSubmitAndPlay}
          />
        </ActionPanel>
      }
    >
      {!radio && <Form.TextField id="url" title="URL" value={url} error={urlError} onChange={setUrl} />}
      <Form.TextField
        id="title"
        title="Title"
        info="The name of the radio station in the list"
        error={titleError}
        value={title}
        onChange={setTitle}
      />
      <Form.TextField
        id="description"
        title="Description (optional)"
        info="Some additional information, i.e. genre, bitrate, etc."
        value={description}
        onChange={setDescription}
      />
    </Form>
  );
}
