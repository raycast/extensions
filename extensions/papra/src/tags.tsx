import { Action, ActionPanel, Form, Icon, Image, List, showToast, Toast, useNavigation } from "@raycast/api";
import {  Organization } from "./types";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { papra, PAPRA_COLOR } from "./papra";

export default function Tags({ organization }: { organization: Organization }) {
  const { isLoading, data: tags,mutate } = useCachedPromise(
    async (organizationId) => {
      const res = await papra.tags.list({ organizationId });
      return res.tags;
    },
    [organization.id],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Organizations / ${organization.name} / Tags`}>
      {!isLoading && !tags.length ? <List.EmptyView icon={{source: Icon.Tag, tintColor: PAPRA_COLOR}} title="No tags yet" description="This organization has no tags yet. Tags are used to categorize documents. You can add tags to your documents to make them easier to find and organize." actions={<ActionPanel>
          <Action.Push icon={Icon.Plus} title="Create Tag" target={<CreateTag organization={organization} />} onPop={mutate} />

      </ActionPanel>} /> : tags.map((tag) => (
        <List.Item key={tag.id} icon={{source: Icon.Tag, tintColor: PAPRA_COLOR}} title={tag.name} accessories={[{date: new Date(tag.createdAt)}]} actions={<ActionPanel>
          <Action.Push icon={Icon.Plus} title="Create Tag" target={<CreateTag organization={organization} />} onPop={mutate} />
        </ActionPanel>} />
      ))}
    </List>
  );
}

const COLORS = ["#D8FF75", "#7FFF7A", "#7AFFCE", "#7AD7FF", "#7A7FFF", "#CE7AFF", "#FF7AD7", "#FF7A7F", "#FFCE7A", "#FFFFFF"]
function CreateTag({organization}:{organization:Organization}) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string, color:string; description:string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        await papra.tags.create({organizationId: organization.id, tag: values})
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
    <Form navigationTitle={`Organizations / ${organization.name} / Tags / Create`}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="Eg. Contracts" {...itemProps.name} />
     <Form.Dropdown title="Color" {...itemProps.color}>
      {COLORS.map(color => <Form.Dropdown.Item key={color} icon={{source: Icon.CircleFilled, mask: Image.Mask.RoundedRectangle, tintColor: color}} title={color} value={color} />)}
     </Form.Dropdown>
     <Form.TextArea title="Description (optional)" placeholder="Eg. All the contracts signed by the company" {...itemProps.description} />
    </Form>
  );
}
