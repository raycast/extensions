import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { onError } from "./utils";
import * as objectstorage from "oci-objectstorage";
import { common, OCIProvider, useProvider } from "./oci";
import OpenInOCI from "./open-in-oci";
import { filesize } from "filesize";
import fs from "fs";

export default function CheckProvider() {
  return (
    <OCIProvider>
      <ObjectStorage />
    </OCIProvider>
  );
}

function ObjectStorage() {
  const { provider } = useProvider();

  const { isLoading, data: buckets } = useCachedPromise(
    async () => {
      const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      const namespace = await objectstorageClient.getNamespace({ compartmentId: provider.getTenantId() });
      const buckets = await objectstorageClient.listBuckets({
        namespaceName: namespace.value,
        compartmentId: provider.getTenantId(),
      });
      return buckets.items;
    },
    [],
    { initialData: [], onError },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search buckets">
      {buckets.map((bucket) => (
        <List.Item
          key={bucket.namespace + bucket.name}
          icon={Icon.Coin}
          title={bucket.name}
          accessories={[
            {
              date: new Date(bucket.timeCreated),
              tooltip: `Created ${new Date(bucket.timeCreated)}`,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Box}
                title="View Objects"
                target={
                  <ListBucketObjects namespaceName={bucket.namespace} bucketName={bucket.name} provider={provider} />
                }
              />
              <OpenInOCI route={`object-storage/buckets/${bucket.namespace}/${bucket.name}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ListBucketObjects({
  namespaceName,
  bucketName,
  provider,
}: {
  namespaceName: string;
  bucketName: string;
  provider: common.ConfigFileAuthenticationDetailsProvider;
}) {
  const {
    isLoading,
    data: objects,
    mutate,
  } = useCachedPromise(
    async () => {
      const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      const objects = await objectstorageClient.listObjects({
        namespaceName,
        bucketName,
        fields: "name,size,timeModified",
      });
      return objects.listObjects.objects;
    },
    [],
    { initialData: [], onError },
  );

  async function confirmAndDelete(objectName: string) {
    const options: Alert.Options = {
      title: "Confirm Delete Object",
      message: `Are you sure you want to delete the object "${objectName}"?`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };

    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", objectName);
    try {
      const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
      await mutate(
        objectstorageClient.deleteObject({
          namespaceName,
          bucketName,
          objectName,
        }),
        {
          optimisticUpdate(data) {
            return data.filter((o) => o.name !== objectName);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      onError(error);
    }
  }

  return (
    <List
      navigationTitle="Object Storage > Buckets > Objects"
      isLoading={isLoading}
      searchBarPlaceholder="Search objects"
    >
      {objects.map((object) => {
        const accessories: List.Item.Accessory[] = [];
        if (object.size) accessories.push({ text: filesize(object.size, { standard: "iec" }) });
        if (object.timeModified) accessories.push({ date: new Date(object.timeModified) });
        const isFolder = object.name.endsWith("/");
        return (
          <List.Item
            key={object.name}
            icon={isFolder ? Icon.Folder : Icon.Box}
            title={object.name}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Upload}
                  title="Upload"
                  target={<UploadObject namespaceName={namespaceName} bucketName={bucketName} provider={provider} />}
                  onPop={mutate}
                />
                {!isFolder && (
                  <Action
                    icon={Icon.Trash}
                    title="Delete"
                    onAction={() => confirmAndDelete(object.name)}
                    style={Action.Style.Destructive}
                  />
                )}
                <OpenInOCI route={`object-storage/buckets/${namespaceName}/${bucketName}/objects`} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function UploadObject({
  namespaceName,
  bucketName,
  provider,
}: {
  namespaceName: string;
  bucketName: string;
  provider: common.ConfigFileAuthenticationDetailsProvider;
}) {
  type FormValues = {
    objectNamePrefix: string;
    files: string[];
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const file = values.files[0];
      if (!fs.existsSync(file)) throw new Error(`${file} does not exist`);
      if (!fs.lstatSync(file).isFile()) throw new Error(`${file} is not a valid file`);
      const objectName = values.objectNamePrefix + file.split("/").pop();
      const toast = await showToast(Toast.Style.Animated, "Uploading", objectName);
      try {
        const objectstorageClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
        await objectstorageClient.putObject({
          namespaceName,
          bucketName,
          objectName,
          putObjectBody: fs.createReadStream(file),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Uploaded";
        pop();
      } catch (error) {
        onError(error);
      }
    },
    validation: {
      files: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Object Storage > Buckets > Objects > Upload"
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Upload} title="Upload" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Object Name Prefix" {...itemProps.objectNamePrefix} />
      <Form.FilePicker allowMultipleSelection={false} {...itemProps.files} />
    </Form>
  );
}
