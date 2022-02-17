import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { client } from "../../api";
import { useState } from "react";
import { AliyunDrive } from "@chyroc/aliyundrive";

export default (props: {
  driveID: string;
  fileID: string;
  onSuccess?: (req: { data: AliyunDrive.RenameFileResp; name: string }) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const { driveID, fileID, onSuccess } = props;
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Rename File"
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
                console.log(`[rename-file] : ${values.name}`);
                const resp = await client.renameFile({
                  drive_id: driveID,
                  name: values.name,
                  file_id: fileID,
                  check_name_mode: "refuse",
                });
                setLoading(false);
                onSuccess && (await onSuccess({ data: resp.data, name: values.name }));
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
      <Form.TextField id="name" title="New Name" />
    </Form>
  );
};
