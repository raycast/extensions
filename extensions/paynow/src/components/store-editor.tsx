import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { Store } from "../types/store.types";
import { zodFieldResolver, zodResolver } from "../utils/zod-resolver";
import { useStores } from "../providers/stores-provider/stores-provider";
import { withProviders } from "../hocs/with-providers";

export interface StoreEditorProps {
  id?: string;
}

const StoreEditor = ({ id }: StoreEditorProps) => {
  const { pop } = useNavigation();
  const { stores, addStore } = useStores();
  const existingStore = id ? stores.find((store) => store.id === id) : undefined;
  const { handleSubmit, itemProps } = useForm<Store>({
    onSubmit: (data) => {
      if (id) {
        addStore({ ...existingStore, ...data });
        showToast({
          style: Toast.Style.Success,
          title: "Store updated!",
        });
      } else {
        addStore(data);
        showToast({
          style: Toast.Style.Success,
          title: "Store added!",
        });
      }
      pop();
    },
    validation: zodResolver(Store, {
      id: (value) => {
        if (id) return; // Skip validation if editing existing store
        const defaultResult = zodFieldResolver(Store.shape.id)(value);
        if (defaultResult) {
          return defaultResult;
        }
        if (stores.find((store) => store.id === value)) {
          return "Store ID must be unique";
        }
      },
    }),
    initialValues: existingStore,
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={id ? "Update Store" : "Add Store"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {id ? (
        <Form.Description text={id} title="ID" />
      ) : (
        <Form.TextField title="ID" placeholder="123456789012345678" {...itemProps.id} />
      )}
      <Form.TextField title="Name" placeholder={existingStore?.name || "My Cool Store"} {...itemProps.name} />
      <Form.TextField
        title="Slug"
        placeholder={existingStore?.slug || "my-cool-store"}
        info={`Used to redirect you to the appropriate dashboard. Make sure to enable 'Include active store in URLs' in your account settings:\nhttps://dashboard.paynow.gg/account`}
        {...itemProps.slug}
      />
      <Form.PasswordField title="API Key" placeholder="pnapi_v1_xxxxxxxxxxxxxxxx" {...itemProps.apiKey} />
    </Form>
  );
};

export default withProviders((props: StoreEditorProps) => {
  const { isLoading } = useStores();
  if (isLoading) {
    return <Form isLoading />;
  }
  return <StoreEditor {...props} />;
});
