import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { client } from "../../api";
import { useState } from "react";
import { AliyunDrive } from "@chyroc/aliyundrive";

export default (props: {
  driveID: string;
  parentFileID: string;
  onSuccess?: (fileResp: AliyunDrive.CreateFolderResp) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const { driveID, parentFileID, onSuccess } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Create Folder"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              if (!values.name) {
                await showToast(Toast.Style.Failure, "name is required");
                return;
              }

              setLoading(true);
              try {
                console.log(`[create-folder] create folder: ${values.name}`);
                const fileResp = await client.createFolder({
                  drive_id: driveID,
                  name: values.name,
                  parent_file_id: parentFileID,
                });
                setLoading(false);
                onSuccess && (await onSuccess(fileResp.data));
                pop();
              } catch (e) {
                setLoading(false);
                await showToast(Toast.Style.Failure, "request fail", `${e}`);
                return;
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Folder Name" />
    </Form>
  );
};
