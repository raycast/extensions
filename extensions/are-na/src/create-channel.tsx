import { Form, ActionPanel, Action, showToast, useNavigation, Toast } from "@raycast/api";
import { showFailureToast, FormValidation, useForm } from "@raycast/utils";
import { useArena } from "./hooks/useArena";
import { ChannelStatus } from "./api/types";
import { ChannelView } from "./components/channel";

type Values = {
  title: string;
  status: ChannelStatus;
};

export default function Command() {
  const { push } = useNavigation();
  const arena = useArena();
  const { handleSubmit, itemProps } = useForm<Values>({
    onSubmit(values) {
      arena
        .channel()
        .create(values.title, values.status)
        .then((chan) => {
          if (!chan) {
            return showToast({ title: "Error", message: "Channel creation failed", style: Toast.Style.Failure });
          }
          showToast({ title: "Submitted form", message: "Channel successfully created" });
          push(
            <ChannelView
              channel={{
                slug: chan.slug,
                title: chan.title,
                user: chan.user,
                open: chan.open,
              }}
            />,
          );
        })
        .catch((error) => {
          showFailureToast(error, { title: "Error" });
        });
    },
    validation: {
      title: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create an Are.na Channel" />
      <Form.TextField title="Title" placeholder="Enter the title of the Channel" {...itemProps.title} />
      <Form.Dropdown id="status" title="Status">
        <Form.Dropdown.Item value="public" title="Public" />
        <Form.Dropdown.Item value="closed" title="Closed" />
        <Form.Dropdown.Item value="private" title="Private" />
      </Form.Dropdown>
    </Form>
  );
}
