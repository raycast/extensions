import {
  Action,
  ActionPanel,
  captureException,
  Color,
  Form,
  Icon,
  Image,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useWorkspaces } from "@hooks/use-workspaces";
import { FormValidation, showFailureToast, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { createItem } from "@/api"; // Adjust the API call to your requirements
import { fetchItem } from "@utils/clipboard";

interface ItemFormValues {
  workspaceId: string;
  sku: string;
  description: string;
  cost: string;
  supplier: string;
  tagIds: string[];
}

const AddItemForm = () => {
  const { push, pop } = useNavigation();

  const [, setWorkspaceId] = useCachedState("selected_workspace", "", { cacheNamespace: "add-items" });
  const { isLoading: isLoadingItem } = useCachedPromise(fetchItem, []);
  const { workspaces, isLoading } = useWorkspaces();

  const { handleSubmit, itemProps, values } = useForm<ItemFormValues>({
    onSubmit: async (vals) => {
      setWorkspaceId(vals.workspaceId);
      await showToast({ style: Toast.Style.Animated, title: "Adding item..." });
      createItem({ ...vals, cost: parseFloat(vals.cost) })
        .then(async () => {
          await showToast({
            style: Toast.Style.Success,
            title: "✅ Item added",
            message: `${vals.sku} has been added to your inventory`,
          });
        })
        .catch(async (err) => {
          captureException(err);
          const toast = await showFailureToast(err, { title: "❗ Failed to add item" });
          toast.primaryAction = {
            title: "Retry",
            onAction: () => {
              push(<AddItemForm />);
              toast.hide();
            },
          };
        })
        .finally(pop);
    },
    validation: {
      sku: FormValidation.Required,
      description: FormValidation.Required,
      cost: (value) => {
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
          return "Cost must be a positive number";
        }
      },
    },
  });

  return (
    <Form
      searchBarAccessory={<Form.LinkAccessory text="Dashboard" target="https://app.retrac.co" />}
      isLoading={isLoading || isLoadingItem}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Item" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new item to your inventory." />
      <Form.Dropdown {...itemProps.workspaceId} title="Workspace">
        {workspaces.map((w) => (
          <Form.Dropdown.Item
            key={w.id}
            value={w.id}
            title={w.name}
            icon={{ source: w.logo ?? "command-icon.png", mask: Image.Mask.Circle }}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField {...itemProps.sku} placeholder="Enter SKU/Item Code" title="Item Code" />
      <Form.TextField {...itemProps.description} placeholder="Enter item description" title="Description" />
      <Form.TextField {...itemProps.cost} placeholder="$12.00" title="Cost (USD)" />
      <Form.TextField {...itemProps.supplier} placeholder="Add supplier" title="Supplier" />
      <Form.TagPicker {...itemProps.tagIds} title="Tags">
        {workspaces
          .find((w) => w.id === values.workspaceId)
          ?.tags?.map((t) => (
            <Form.TagPicker.Item
              key={t.id}
              value={t.id}
              title={t.name}
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
            />
          ))}
      </Form.TagPicker>
    </Form>
  );
};

export default function AddItem() {
  return <AddItemForm />;
}
