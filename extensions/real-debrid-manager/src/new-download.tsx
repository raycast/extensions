import { Form, ActionPanel, Action, popToRoot, LaunchProps, showToast, Toast } from "@raycast/api";
import { validateLinkInput } from "./utils/validation";
import { useUnrestrict } from "./hooks";
import { useState } from "react";
import { TorrentItemData, UnrestrictLinkResponse } from "./schema";
import { isUnrestrictedHosterLink, isUnrestrictedTorrent } from "./utils";

interface FormValues {
  link: string;
  file?: string[];
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { draftValues } = props;
  const { unRestrictLink, getTorrentStatus, selectTorrentFiles } = useUnrestrict();
  const [linkError, setLinkError] = useState("");

  const handleSuccess = () => {
    showToast(Toast.Style.Success, "Added Successfully");
    popToRoot();
  };

  const handleFailure = (error: string) => {
    showToast(Toast.Style.Failure, error);
  };

  const handleUnrestrictedTorrent = async (response: UnrestrictLinkResponse) => {
    const torrentData = (await getTorrentStatus(response?.id)) as TorrentItemData;
    if (torrentData.status === "waiting_files_selection") {
      await selectTorrentFiles(torrentData?.id, "all");
      handleSuccess();
      return;
    }
    handleSuccess();
    return;
  };

  const handleSubmit = async ({ link }: FormValues) => {
    const { type, valid } = validateLinkInput(link);
    if (!valid || !type) {
      setLinkError(`Not a valid URL or magnet`);
      return;
    }
    showToast(Toast.Style.Animated, "Sending link to RD");
    setLinkError("");
    try {
      const response = (await unRestrictLink(link, type)) as UnrestrictLinkResponse;
      if (isUnrestrictedTorrent(response)) {
        handleUnrestrictedTorrent(response);
      }
      if (isUnrestrictedHosterLink(response)) {
        handleSuccess();
      }
    } catch (error) {
      handleFailure(error as string);
    }
  };
  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="link"
        autoFocus
        title="Link"
        placeholder="Magnet or Hoster Link"
        defaultValue={draftValues?.link}
        error={linkError}
      />
    </Form>
  );
}
