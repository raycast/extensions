import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { buildUrl, sendportalRequest } from "./sendportal";
import { CreateTemplateRequest, PaginatedResult, Template } from "./types";
import TurndownService from "turndown";

const turndown = new TurndownService();

export default function Templates() {
  const {
    isLoading,
    data: templates,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await sendportalRequest<PaginatedResult<Template>>("templates");
      return data;
    },
    [],
    { initialData: [] },
  );

  const confirmAndDelete = (template: Template) => {
    confirmAlert({
      icon: { source: Icon.Trash, tintColor: Color.Red },
      title: `Delete "${template.name}"?`,
      message: "Are you sure you want to delete this template?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", template.name);
          try {
            await mutate(sendportalRequest(`templates/${template.id}`, { method: "DELETE" }), {
              optimisticUpdate(data) {
                return data.filter((t) => t.id !== template.id);
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
    <List isLoading={isLoading} isShowingDetail>
      {!isLoading && !templates.length ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="New Template" target={<NewTemplate />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        templates.map((template) => (
          <List.Item
            key={template.id}
            icon={Icon.Document}
            title={template.name}
            detail={<List.Item.Detail markdown={turndown.turndown(template.content)} />}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={buildUrl(`templates/${template.id}/edit`)} />
                <Action.Push icon={Icon.Plus} title="New Template" target={<NewTemplate />} onPop={mutate} />
                <Action
                  icon={Icon.Trash}
                  title="Delete Template"
                  style={Action.Style.Destructive}
                  onAction={() => confirmAndDelete(template)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function NewTemplate() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateTemplateRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await sendportalRequest("templates", { method: "POST", body: JSON.stringify(values) });
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
      content: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Save Template" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Template Name" {...itemProps.name} />
      <Form.TextArea title="Content" {...itemProps.content} />
    </Form>
  );
}
