import { Form, ActionPanel, Action, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { validateLinkInput, validateTorrentFile } from "./utils/validation";
import { useState } from "react";
import { UnrestrictTorrentResponse } from "./schema";
import { isTorrentPendingFileSelection } from "./utils";
import { TorrentFileSelection } from "./components";
import { requestAddMagnet, requestAddTorrentFile, requestLinkUnrestrict, requestTorrentDetails } from "./api";

interface FormValues {
  link: string;
  files?: string[];
}

export const NewDownload = () => {
  const { push } = useNavigation();
  const [linkError, setLinkError] = useState("");
  const [fileSelectError, setFileSelectError] = useState("");
  const [currentInput, setCurrentInput] = useState<"none" | "link" | "torrent">("none");

  const handleSuccess = () => {
    showToast(Toast.Style.Success, "Added Successfully");
    popToRoot();
  };

  const handleFailure = (error: string) => {
    showToast(Toast.Style.Failure, error);
  };

  const handleUnrestrictedTorrent = async (response: UnrestrictTorrentResponse) => {
    try {
      const torrentData = await requestTorrentDetails(response?.id);
      if (isTorrentPendingFileSelection(torrentData.status) && torrentData?.files?.length) {
        push(<TorrentFileSelection torrentItemData={torrentData} />);
        await showToast(Toast.Style.Success, "Select files for Download");
      } else {
        handleSuccess();
        return;
      }
    } catch (error) {
      await showToast(Toast.Style.Failure, error as string);
    }
  };
  const handleLinkChange = (link: string) => {
    if (link !== "") {
      setCurrentInput("link");
    } else {
      setCurrentInput("none");
      setLinkError("");
    }
    const { type, valid } = validateLinkInput(link);
    if (link && (!valid || !type)) {
      setLinkError(`Not a valid URL or magnet`);
      return;
    }
    setLinkError("");
    return;
  };

  const handleFileChange = (filePath: string) => {
    if (filePath) {
      setCurrentInput("torrent");
    } else {
      setCurrentInput("none");
      setFileSelectError("");
    }
    if (filePath) {
      try {
        validateTorrentFile(filePath);
        setFileSelectError("");
      } catch (error) {
        if (error instanceof Error) {
          setFileSelectError(error.message);
        }
      }
    }
  };

  const handleTorrentSubmit = async (filePath: string): Promise<void> => {
    try {
      validateTorrentFile(filePath);
      showToast(Toast.Style.Animated, "Uploading torrent file...");
      const response = await requestAddTorrentFile(filePath);
      handleUnrestrictedTorrent(response);
    } catch (error) {
      showToast(Toast.Style.Failure, error as string);
    }
  };

  const handleLinkSubmit = async (link: string) => {
    const { type, valid } = validateLinkInput(link);
    if (!valid || !type) {
      setLinkError(`Not a valid URL or magnet`);
      return;
    }

    showToast(Toast.Style.Animated, "Sending link to RD");
    setLinkError("");
    try {
      switch (type) {
        case "link":
          requestLinkUnrestrict(link);
          handleSuccess();
          break;
        case "magnet":
          handleUnrestrictedTorrent(await requestAddMagnet(link));
          break;
      }
    } catch (error) {
      handleFailure(error as string);
    }
  };

  const handleSubmit = async ({ link, files }: FormValues) => {
    if (link) {
      handleLinkSubmit(link);
    }
    if (files?.length) {
      handleTorrentSubmit(files[0]);
      return;
    }
  };
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {currentInput !== "torrent" && (
        <Form.TextField
          id="link"
          autoFocus
          title="Link"
          onChange={(link) => handleLinkChange(link)}
          placeholder="Magnet or Hoster Link"
          error={linkError}
        />
      )}
      {currentInput !== "link" && (
        <Form.FilePicker
          allowMultipleSelection={false}
          onChange={([selectedFile]) => handleFileChange(selectedFile)}
          id="files"
          title="Torrent file"
          error={fileSelectError}
        />
      )}
    </Form>
  );
};

export default NewDownload;
