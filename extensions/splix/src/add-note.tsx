import Protected from "./components/protected";
import { Form, ActionPanel, Action, Toast, showToast, Icon } from "@raycast/api";
import { supabase } from "./supabase";
import { signOut } from "./auth/google";
import { useForm } from "@raycast/utils";

type AddNoteForm = {
  content: string;
  description: string;
};

export default function AddNote() {
  async function addNote(values: { content: string; description: string }) {
    const formatedValues = {
      ...values,
      content: [
        {
          type: "p",
          children: [{ text: values.content }],
        },
      ],
    };
    reset(); // optimistic
    showToast({ style: Toast.Style.Success, title: "Successfully added note" });

    const { error } = await supabase.functions.invoke("create-note", {
      body: JSON.stringify(formatedValues),
    });
    if (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to add note" });
      setValue("content", values.content);
      setValue("description", values.description);
      return;
    }
  }

  const { handleSubmit, itemProps, reset, setValue } = useForm<AddNoteForm>({
    onSubmit(values) {
      addNote(values);
    },
    validation: {
      description: (value) => {
        if (!value) {
          return "Description is required";
        }
        if (value.length < 2) {
          return "Description must be at least 2 characters.";
        }
        if (value.length > 300) {
          return "Description must be less than 300 characters.";
        }
      },
      content: (value) => {
        const maxByteSize = 5 * 1024 * 1024; // 10MB in bytes

        const byteSize = new TextEncoder().encode(JSON.stringify(value)).byteLength;
        if (byteSize >= maxByteSize) {
          return `Note content must be less than ${maxByteSize / 1024 / 1024}MB.`;
        }
      },
    },
  });

  return (
    <Protected>
      <Form
        enableDrafts
        actions={
          <ActionPanel>
            <Action.SubmitForm title="Add Note" icon={Icon.Plus} onSubmit={handleSubmit} />
            <Action.OpenInBrowser title="Go to Splix.app" icon={Icon.Globe} url={"https://splix.app/dashboard"} />
            <Action title="Sign Out" icon={Icon.Logout} onAction={signOut} />
          </ActionPanel>
        }
      >
        <Form.TextArea title="Note Content" placeholder="Note content..." {...itemProps.content} />
        <Form.TextField title="Note Description" placeholder="Note description..." {...itemProps.description} />
      </Form>
    </Protected>
  );
}
