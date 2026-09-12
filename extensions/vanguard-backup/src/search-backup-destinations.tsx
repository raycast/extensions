import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { callVanguard, useVanguardPaginated } from "./vanguard";
import { BackupDestination, BackupDestinationType, CreateBackupDestination } from "./types";

export default function SearchBackupDestinations() {
  const {
    isLoading,
    data: destinations,
    pagination,
    error,
    revalidate,
  } = useVanguardPaginated<BackupDestination>("backup-destinations");

  return (
    <List isLoading={isLoading} pagination={pagination}>
      {!isLoading && !destinations.length && !error ? (
        <List.EmptyView
          icon="backup-destination.svg"
          title="You don't have any backup destinations!"
          description="You can configure your first backup destination by clicking the button below."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add Backup Destination"
                target={<AddBackupDestination />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        destinations.map((destination) => (
          <List.Item
            key={destination.id}
            icon="backup-destination.svg"
            title={destination.label}
            subtitle={destination.type_human}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Add Backup Destination"
                  target={<AddBackupDestination />}
                  onPop={revalidate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddBackupDestination() {
  type FormValues = Omit<CreateBackupDestination, "type"> & {
    type: string;
  };

  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.label);
      try {
        await callVanguard("backup-destinations", {
          method: "POST",
          body: values,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    initialValues: {
      type: BackupDestinationType["Custom S3"],
      path_style_endpoint: true,
    },
    validation: {
      label: FormValidation.Required,
      type: FormValidation.Required,
      s3_access_key(value) {
        if (values.type !== BackupDestinationType.Local && !value) return "The item is required";
      },
      s3_secret_key(value) {
        if (values.type !== BackupDestinationType.Local && !value) return "The item is required";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon="backup-destination.svg" title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {values.type !== BackupDestinationType.Local ? (
        <Form.Description
          title="Security Notice"
          text="All keys entered here are encrypted and securely stored in the database."
        />
      ) : (
        <Form.Description
          title="About Local Configuration"
          text="You will specify a local path when creating a Backup Task."
        />
      )}
      <Form.TextField title="Label" {...itemProps.label} />
      <Form.Dropdown title="Type" {...itemProps.type}>
        {Object.entries(BackupDestinationType).map(([key, value]) => (
          <Form.Dropdown.Item key={key} title={key} value={value} />
        ))}
      </Form.Dropdown>
      {values.type !== BackupDestinationType.Local && (
        <>
          <Form.Separator />
          <Form.TextField title="Access Key" {...itemProps.s3_access_key} />
          <Form.PasswordField title="Secret Key" {...itemProps.s3_secret_key} />
          <Form.TextField title="Bucket Name" {...itemProps.s3_bucket_name} />
          {(values.type === BackupDestinationType["Custom S3"] ||
            values.type === BackupDestinationType["DigitalOcean S3 Spaces"]) && (
            <Form.TextField title="Endpoint" {...itemProps.custom_s3_endpoint} />
          )}
          <Form.TextField
            title="Region"
            info="The region where the bucket is located. This is optional for Custom S3s."
            {...itemProps.custom_s3_region}
          />
          <Form.Checkbox
            label="Use Path Style Endpoint"
            info="This will append the bucket name to the URL instead of adding it as a subdomain."
            {...itemProps.path_style_endpoint}
          />
        </>
      )}
    </Form>
  );
}
