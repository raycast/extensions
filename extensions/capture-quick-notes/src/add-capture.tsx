import {
  Action,
  ActionPanel,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  addCapture,
  CaptureListDTO,
  errorMessage,
  listCaptureLists,
} from "./capture-cli";

type FormValues = {
  content: string;
  listName?: string;
};

export default function Command() {
  const [lists, setLists] = useState<CaptureListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadLists() {
      try {
        const result = await listCaptureLists();
        if (isActive) {
          setLists(result);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not load lists",
          message: errorMessage(error),
        });
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadLists();
    return () => {
      isActive = false;
    };
  }, []);

  async function handleSubmit(values: FormValues) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Adding capture",
    });

    try {
      const capture = await addCapture(
        values.content,
        values.listName || undefined,
      );
      toast.style = Toast.Style.Success;
      toast.title = "Capture added";
      toast.message = capture.content || capture.urls[0];
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not add capture";
      toast.message = errorMessage(error);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Capture" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Text, URL, or note"
        autoFocus
      />
      <Form.Dropdown id="listName" title="List" defaultValue="">
        <Form.Dropdown.Item value="" title="Inbox" />
        {lists.map((list) => (
          <Form.Dropdown.Item
            key={list.id}
            value={list.name}
            title={list.name}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
