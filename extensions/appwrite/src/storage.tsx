import { FormValidation, MutatePromise, useCachedPromise, useForm } from "@raycast/utils";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useContext } from "react";
import { sdk, SDKContext } from "./sdk";
import Files from "./storage/files";

export default function Storage() {
  const { storage } = useContext(SDKContext);
  const {
    isLoading,
    data: buckets,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const res = await storage.listBuckets();
      return res.buckets;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {!isLoading && !buckets.length && !error ? (
        <List.EmptyView
          title="Create your first bucket"
          description="Need a hand? Learn more in our documentation."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Bucket" target={<CreateBucket mutate={mutate} />} />
              <Action.OpenInBrowser title="Documentation" url="https://appwrite.io/docs/products/storage" />
            </ActionPanel>
          }
        />
      ) : (
        buckets.map((bucket) => (
          <List.Item
            key={bucket.$id}
            icon={Icon.Folder}
            title={bucket.name}
            accessories={[
              { icon: Icon.Plus, date: new Date(bucket.$createdAt), tooltip: `Created: ${bucket.$createdAt}` },
              { icon: Icon.Pencil, date: new Date(bucket.$updatedAt), tooltip: `Updated: ${bucket.$updatedAt}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Document} title="Files" target={<Files bucket={bucket} />} />
                <Action.Push icon={Icon.Plus} title="Create Bucket" target={<CreateBucket mutate={mutate} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateBucket({ mutate }: { mutate: MutatePromise<sdk.Models.Bucket[]> }) {
  type FormValues = {
    name: string;
    bucketId: string;
  };
  const { pop } = useNavigation();
  const { storage } = useContext(SDKContext);
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const { name, bucketId } = values;
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await mutate(storage.createBucket(bucketId, name));
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name: FormValidation.Required,
      bucketId: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="New bucket" {...itemProps.name} />
      <Form.TextField
        title="Bucket ID"
        placeholder="Enter ID"
        info="Allowed characters: alphanumeric, non-leading hyphen, underscore, period"
        {...itemProps.bucketId}
      />
    </Form>
  );
}
