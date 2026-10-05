import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { Action, ActionPanel, Form, Grid, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import OpenInChatwoot from "./open-in-chatwoot";

export default function ListPortals() {
  const {
    isLoading,
    data: portals,
    error,
    mutate,
  } = useCachedPromise(
    async () => {
      const { payload } = await chatwoot.portals.list();
      return payload;
    },
    [],
    { initialData: [] },
  );

  return (
    <Grid isLoading={isLoading}>
      {!isLoading && !portals.length && !error ? (
        <Grid.EmptyView
          description="Create self-service help center portals for your customers. Help them find answers quickly, without waiting. Streamline inquiries, boost agent efficiency, and elevate customer support."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Portal" target={<CreatePortal />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        portals.map((portal) => (
          <Grid.Item
            key={portal.id}
            content={portal.logo?.file_url || { source: Icon.Book, tintColor: portal.color }}
            title={portal.name}
            subtitle={portal.header_text}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Plus} title="Create Portal" target={<CreatePortal />} onPop={mutate} />
                <OpenInChatwoot route={`settings/portals/${portal.slug}/settings`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}

function CreatePortal() {
  const { pop } = useNavigation();
  type FormValues = {
    name: string;
    slug: string;
  };
  const { handleSubmit, itemProps, values } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        await chatwoot.portals.create({
          portal: {
            ...values,
            header_text: values.name,
            color: "#FFFFFF",
            custom_domain: "",
            homepage_link: "",
            page_title: values.name,
            archived: false,
            config: { allowed_locales: ["en"], default_locale: "en" },
          },
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
    validation: {
      name: FormValidation.Required,
      slug: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Portal" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Give your portal a name and create a user-friendly URL slug. You can modify both later in the settings." />
      <Form.TextField title="Name" placeholder="Portal name" {...itemProps.name} />
      <Form.TextField title="Slug" placeholder="Portal slug" {...itemProps.slug} />
      <Form.Description text={chatwoot.buildUrl(values.slug || "SLUG").toString()} />
    </Form>
  );
}
