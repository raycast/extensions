import { LaunchProps, ActionPanel, Form, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { saveService } from "./utils/storage";
import type { GrpcUiItem } from "./types";

export default function Command(props: LaunchProps<{ draftValues: GrpcUiItem }>) {
  const { draftValues } = props;

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={async (values: GrpcUiItem) => {
              if (!values.title || !values.url) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Both fields are required!",
                });
                return;
              }

              await saveService(values.title, values.url);

              showToast({
                style: Toast.Style.Success,
                title: "Saved!",
              });
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="URL"
        placeholder="localhost:9000"
        info="Can include grpcui flags like -plaintext or -insecure"
        defaultValue={draftValues?.url}
      />
      <Form.TextField id="title" title="Title" placeholder="My gRPC Service" defaultValue={draftValues?.title} />
    </Form>
  );
}
