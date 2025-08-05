import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAppInfo, useUpload } from "./lib/hooks";
import { ACLTitleMap, filePathsToFile, guardInvalidApiKey } from "./lib/utils";
import { FileGrid } from "./lib/file-grid";
import { ACL } from "@uploadthing/shared";

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
  const appInfo = useAppInfo();

  const keyCheck = guardInvalidApiKey();
  if (keyCheck) return keyCheck;

  const handleSubmit = async (
    values: { files: string[] },
    acl: ACL | undefined,
  ) => {
    if (values.files.length === 0) {
      showToast(Toast.Style.Failure, "Please select at least one file");
      return;
    }

    const files = await filePathsToFile(values.files);
    upload({ files, acl });
  };

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
      <Form.FilePicker id="files" title="Select Files" />
    </Form>
  );
};
