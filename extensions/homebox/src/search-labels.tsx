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
import { useLabels } from "./hooks";
import { useForm } from "@raycast/utils";
import { homebox } from "./homebox";
import { CreateLabelRequest } from "./types";

export default function SearchLabels() {
  const { isLoading, labels, mutate } = useLabels();
  return (
    <List isLoading={isLoading}>
      {labels.map((label) => (
        <List.Item
          key={label.id}
          icon={{ source: Icon.Tag, tintColor: label.color }}
          title={label.name}
          subtitle={label.description}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Plus} title="Create Label" target={<CreateLabel />} onPop={mutate} />
              <Action
                icon={Icon.Trash}
                title="Delete"
                onAction={() =>
                  confirmAlert({
                    title: "Confirm",
                    message: "Are you sure you want to delete this label?",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Confirm",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", label.name);
                        try {
                          await mutate(homebox.labels.delete(label.id), {
                            optimisticUpdate(data) {
                              return data.filter((l) => l.id !== label.id);
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
                  })
                }
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateLabel() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CreateLabelRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const result = await homebox.labels.create(values);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        toast.message = result.name;
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      name(value) {
        if (!value) return "The item is required";
        if (value.length > 50) return "Name is too long";
      },
      description(value) {
        if (value && value.length > 1000) return "Description is too long";
      },
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
      <Form.TextField title="Label Name" {...itemProps.name} />
      <Form.TextArea title="Label Description" {...itemProps.description} />
    </Form>
  );
}
