import {
  confirmAlert,
  Icon,
  Color,
  Alert,
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  useNavigation,
  Form,
} from "@raycast/api";
import { useCachedPromise, useForm, FormValidation } from "@raycast/utils";
import { chatwoot } from "../chatwoot";
import { CannedResponse } from "../types";

export default function ListCannedResponses() {
  const {
    isLoading,
    data: responses,
    mutate,
  } = useCachedPromise(
    async () => {
      const payload = await chatwoot.cannedResponses.list();
      return payload;
    },
    [],
    { initialData: [] },
  );

  function confirmAndDelete(response: CannedResponse) {
    confirmAlert({
      icon: { source: Icon.XMarkCircle, tintColor: Color.Red },
      title: "Confirm Deletion",
      message: `Are you sure to delete ${response.short_code} ?`,
      dismissAction: {
        title: `No, keep ${response.short_code}`,
      },
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: `Yes, delete ${response.short_code}`,
        async onAction() {
          const toast = await showToast(Toast.Style.Animated, "Deleting", `${response.short_code}`);
          try {
            await mutate(chatwoot.cannedResponses.delete({ cannedResponseId: response.id }), {
              optimisticUpdate(data) {
                return data.filter((c) => c.id !== response.id);
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
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!isLoading && !responses.length ? (
        <List.EmptyView
          description="There are no canned responses available in this account."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.PlusCircle}
                title="Add Canned Response"
                target={<AddCannedResponse />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        responses.map((response) => (
          <List.Item
            key={response.id}
            icon={Icon.Text}
            title={response.short_code}
            detail={<List.Item.Detail markdown={response.content} />}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Add Canned Response"
                  target={<AddCannedResponse />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.XMarkCircle}
                  title="Delete Canned Response"
                  onAction={() => confirmAndDelete(response)}
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

function AddCannedResponse() {
  const { pop } = useNavigation();
  type FormValues = {
    short_code: string;
    content: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.short_code);
      try {
        await chatwoot.cannedResponses.create({ cannedResponse: values });
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
      short_code: FormValidation.Required,
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Canned Responses are predefined reply templates which can be used to quickly send out replies to conversations." />
      <Form.TextField title="Short code" placeholder="Please enter a short code." {...itemProps.short_code} />
      <Form.TextArea
        title="Message"
        placeholder="Please write the message you want to save as a template to use later."
        {...itemProps.content}
      />
    </Form>
  );
}
