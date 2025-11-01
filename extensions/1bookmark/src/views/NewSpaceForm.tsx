import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useRef } from "react";

interface FormValues {
  name: string;
  image: string;
  description: string;
}

function Body() {
  const textFieldRef = useRef<Form.TextField>(null);
  const textAreaRef = useRef<Form.TextArea>(null);

  const { pop } = useNavigation();
  const create = trpc.space.create.useMutation();

  function handleSubmit(form: FormValues) {
    create.mutate(
      {
        name: form.name,
        image: form.image,
        description: form.description,
      },
      {
        onSuccess: () => {
          showToast({
            style: Toast.Style.Success,
            title: "Space created",
          });
          pop();
        },
      },
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Space" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" ref={textFieldRef} />
      <Form.TextField
        id="image"
        title="Image"
        placeholder="https://..."
        info="Image upload is not supported yet. Please enter the space logo image url."
      />
      <Form.TextArea id="description" title="Description" ref={textAreaRef} />
    </Form>
  );
}

export const NewSpaceForm = () => {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
};
