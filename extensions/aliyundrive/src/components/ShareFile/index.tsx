import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { client } from "../../api";
import { useState } from "react";
import { AliyunDrive } from "@chyroc/aliyundrive";
import ShareFileResult from "./ShareFileResult";

export default (props: {
  driveID: string;
  fileID: string;
  onSuccess?: (data: AliyunDrive.ShareFileResp) => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const { driveID, fileID, onSuccess } = props;
  const { push, pop } = useNavigation();
  const [noExpiration, setNoExpiration] = useState(false);

  return (
    <Form
      navigationTitle="Share File"
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit"
            onSubmit={async (values) => {
              const expiration = noExpiration ? "" : values.expiration;
              const sharePwd = values.share_type === "private" ? randPwd() : "";
              console.log({ expiration, sharePwd });

              setLoading(true);
              try {
                console.log(`[share-file]`);
                const resp = await client.shareFile({
                  expiration,
                  drive_id: driveID,
                  file_id_list: [fileID],
                  share_pwd: sharePwd,
                });
                setLoading(false);
                // onSuccess && await onSuccess(resp.data)
                // pop();
                push(<ShareFileResult data={resp.data} />);
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
      <Form.Checkbox
        id="is_no_expiration"
        label="Make Share File No Expiration"
        value={noExpiration}
        onChange={setNoExpiration}
        defaultValue={noExpiration}
      />
      {!noExpiration && <Form.DatePicker id="expiration" title="Expiration Date" defaultValue={new Date()} />}
      <Form.Dropdown id="share_type" title="Share Type" defaultValue={"public"}>
        <Form.Dropdown.Item value="public" title="Public Share" />
        <Form.Dropdown.Item value="private" title="Private Share" />
      </Form.Dropdown>
    </Form>
  );
};

function randPwd(length = 4) {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
