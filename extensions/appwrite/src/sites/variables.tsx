import {
  List,
  Icon,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Form,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise, MutatePromise, useForm, FormValidation } from "@raycast/utils";
import { useContext } from "react";
import { SDKContext, sdk } from "../sdk";
import CopyIDAction from "../common/CopyIDAction";

export default function Variables({ siteId }: { siteId: string }) {
  const { sites } = useContext(SDKContext);
  const {
    isLoading,
    data: variables,
    mutate,
  } = useCachedPromise(
    async (siteId) => {
      const res = await sites.listVariables({ siteId });
      return res.variables;
    },
    [siteId],
    {
      initialData: [],
    },
  );

  async function confirmAndDelete(variable: sdk.Models.Variable) {
    if (
      !(await confirmAlert({
        title: "Delete variable",
        message: "Are you sure you want to delete this variable? This action is irreversible.",
        primaryAction: {
          style: Alert.ActionStyle.Destructive,
          title: "Delete",
        },
      }))
    )
      return;
    const toast = await showToast(Toast.Style.Animated, "Deleting Variable", variable.key);
    try {
      await mutate(sites.deleteVariable({ siteId, variableId: variable.$id }), {
        optimisticUpdate(data) {
          return data.filter((v) => v.$id !== variable.$id);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted Variable";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !variables.length ? (
        <List.EmptyView
          icon={Icon.PlusCircle}
          title="Create a variable to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.PlusCircle}
                title="Create Variable"
                target={<CreateVariable siteId={siteId} mutate={mutate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        variables.map((variable) => (
          <List.Item
            key={variable.$id}
            icon={Icon.Code}
            title={variable.key}
            accessories={[variable.secret ? { tag: "SECRET" } : { text: variable.value }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Key to Clipboard" content={variable.key} />
                <Action.CopyToClipboard title="Copy Value to Clipboard" content={variable.value} />
                <CopyIDAction item={variable} />

                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Create Variable"
                  target={<CreateVariable siteId={siteId} mutate={mutate} />}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Variable"
                  onAction={() => confirmAndDelete(variable)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateVariable({ siteId, mutate }: { siteId: string; mutate: MutatePromise<sdk.Models.Variable[]> }) {
  type FormValues = {
    key: string;
    value: string;
    secret: boolean;
  };
  const { pop } = useNavigation();
  const { sites } = useContext(SDKContext);
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.key);
      try {
        await mutate(sites.createVariable({ ...values, siteId }));
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
      key: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="When there is a naming conflict with a global variable in your project settings and a site environment variable, the global variable will be ignored." />
      <Form.TextField title="Key" placeholder="ENTER_KEY" {...itemProps.key} />
      <Form.PasswordField title="Value (optional)" placeholder="Enter value" {...itemProps.value} />
      <Form.Checkbox
        label="Secret"
        info="If selected, you and your team won't be able to read the values after creation."
        {...itemProps.secret}
      />
    </Form>
  );
}
