import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { buildPapraUrl, papra, PAPRA_COLOR } from "./papra";
import Documents from "./documents";
import Tags from "./tags";
import { Organization } from "./types";
import OpenInPapra from "./open-in-papra";

export default function Command() {
  try {
    buildPapraUrl("");
    return <Organizations />;
  } catch {
    return <Detail markdown={`# ERROR \n\n Papra URL is Invalid`} />;
  }
}
function Organizations() {
  const [, setSelectedOrganizationId] = useCachedState<string | null>("selected-organization-id");
  const {
    isLoading,
    data: organizations,
    mutate,
  } = useCachedPromise(
    async () => {
      const res = await papra.organizations.list();
      return res.organizations;
    },
    [],
    { initialData: [] },
  );

  const confirmAndDelete = (organization: Organization) => {
    confirmAlert({
      title: "Delete Organization",
      message:
        "Are you sure you want to delete this organization? The organization will be marked for deletion and permanently removed after 30 days. During this period, you can restore it from your organizations list. All documents and data will be permanently deleted after this delay.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Organization",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", organization.name);
          try {
            await mutate(papra.organizations.delete({ id: organization.id }), {
              optimisticUpdate(data) {
                return data.filter((o) => o.id !== organization.id);
              },
              shouldRevalidateAfter: false,
            });
            toast.style = Toast.Style.Success;
            toast.title = "Deleted";
          } catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed";
            toast.message = `${error}`;
          }
        },
      },
    });
  };

  return (
    <List isLoading={isLoading} onSelectionChange={setSelectedOrganizationId}>
      {organizations.map((organization) => (
        <List.Item
          id={organization.id}
          key={organization.id}
          icon={{ source: Icon.Building, tintColor: PAPRA_COLOR }}
          title={organization.name}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Documents" target={<Documents organization={organization} />} />
              <Action.Push icon={Icon.Tag} title="Tags" target={<Tags organization={organization} />} />
              <OpenInPapra route="" />
              <Action.Push
                icon={Icon.Plus}
                title="Create Organization"
                target={<CreateOrganization />}
                onPop={mutate}
                shortcut={Keyboard.Shortcut.Common.New}
              />
              <Action
                icon={Icon.Trash}
                title="Delete Organization"
                onAction={() => confirmAndDelete(organization)}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateOrganization() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await papra.organizations.create({ name: values.name });
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
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Organization" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Your documents will be grouped by organization. You can create multiple organizations to separate your documents, for example, for personal and work documents." />
      <Form.TextField title="Organization name" placeholder="Eg. Acme Inc." {...itemProps.name} />
    </Form>
  );
}
