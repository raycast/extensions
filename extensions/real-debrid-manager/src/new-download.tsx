import { Form, ActionPanel, Action, popToRoot, LaunchProps, showToast, Toast, useNavigation } from "@raycast/api";
import { validateLinkInput } from "./utils/validation";
import { useTorrents, useUnrestrict } from "./hooks";
import { useState } from "react";
import { TorrentItemDataExtended, UnrestrictLinkResponse } from "./schema";
import { isTorrentPendingFileSelection, isUnrestrictedHosterLink, isUnrestrictedTorrent } from "./utils";
import { TorrentFileSelection } from "./components";

interface FormValues {
  link: string;
  file?: string[];
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { push } = useNavigation();
  const { draftValues } = props;
  const { unRestrictLink } = useUnrestrict();
  const { getTorrentDetails } = useTorrents();
  const [linkError, setLinkError] = useState("");

  const handleSuccess = () => {
    showToast(Toast.Style.Success, "Added Successfully");
    popToRoot();
  };

  const handleFailure = (error: string) => {
    showToast(Toast.Style.Failure, error);
  };

  const handleUnrestrictedTorrent = async (response: UnrestrictLinkResponse) => {
    const torrentData = (await getTorrentDetails(response?.id)) as TorrentItemDataExtended;
    if (isTorrentPendingFileSelection(torrentData.status) && torrentData?.files?.length) {
      push(<TorrentFileSelection torrentItemData={torrentData} />);
      showToast(Toast.Style.Success, "Select files for Download");
    } else {
      handleSuccess();
      return;
    }
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
