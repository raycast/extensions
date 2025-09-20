import { ActionPanel, Action, Form, useNavigation } from "@raycast/api";
import { withToast } from "./utils";
import { useScoop } from "./hooks/scoopHooks";

export default function AddBucketCommand() {
  const { pop } = useNavigation();
  const scoop = useScoop();

  async function handleSubmit(values: { bucketName: string }) {
    if (!values.bucketName) {
      return;
    }
    await withToast(
      async () => {
        await scoop.bucketAdd(values.bucketName);
        pop();
      },
      {
        loading: `Adding bucket ${values.bucketName}...`,
        success: `Bucket ${values.bucketName} added.`,
        failure: `Failed to add bucket ${values.bucketName}.`,
      },
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Bucket" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="bucketName" title="Bucket Name" placeholder="Enter bucket name (e.g., 'extras')" />
      <Form.Description text="You can find more buckets at https://scoop.sh/#/buckets" />
    </Form>
  );
}
