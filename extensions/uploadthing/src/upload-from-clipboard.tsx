import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppInfo, useClipboardFiles, useUpload } from "./lib/hooks";
import { ACLTitleMap, filePathsToFile, guardInvalidApiKey } from "./lib/utils";
import { FileGrid } from "./lib/file-grid";
import { ACL } from "@uploadthing/shared";
import { useEffect } from "react";

const queryClient = new QueryClient();
export default () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Command />
    </QueryClientProvider>
  );
};

const Command = () => {
  const { upload, uploadedFiles } = useUpload();
  const { files, readingClipboard } = useClipboardFiles();
  const appInfo = useAppInfo();

  useEffect(() => {
    if (!files) return;

    if (files.length > 0) {
      showToast(
        Toast.Style.Success,
        `Found ${files.length} files in your clipboard. Confirm which ones to upload.`,
      );
    } else {
      showToast(
        Toast.Style.Failure,
        "No files found in your clipboard, select and upload.",
      );
    }
  }, [files]);

  const handleSubmit = async (
    values: { files: string[] },
    acl: ACL | undefined,
  ) => {
    if (values.files.length === 0) {
      showToast(Toast.Style.Failure, "Please select at least one file");
      return;
    }

    const files = await filePathsToFile(
      values.files.map((file) => file.replace(/^\/file:/, "file://")),
    );

    upload({ files, acl });
  };

  const keyCheck = guardInvalidApiKey();
  if (keyCheck) return keyCheck;

  if (!files || readingClipboard) {
    return (
      <Detail
        isLoading={readingClipboard}
        markdown={
          readingClipboard
            ? null
            : `## The contents of your clipboard is not a file. Copy a file to your clipboard and try again.`
        }
      />
    );
  }

  if (uploadedFiles.length > 0) {
    return <FileGrid files={uploadedFiles} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm<{ files: string[] }>
            icon={Icon.Upload}
            title={`Upload Files ${appInfo ? `(${ACLTitleMap[appInfo.primary]})` : ""}`}
            onSubmit={(values) => handleSubmit(values, appInfo?.primary)}
          />
          {appInfo?.secondary && (
            <Action.SubmitForm<{ files: string[] }>
              title={`Upload Files (${ACLTitleMap[appInfo.secondary]})`}
              onSubmit={(values) => handleSubmit(values, appInfo.secondary)}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Select Files" defaultValue={files} />
    </Form>
  );
};
