import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, useNavigation } from "@raycast/api";
import Requests, { Values } from "../requests";

export default function RequestDetails({ req }: { req: Values }) {
  const parsedValue = JSON.parse(req.value);
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [title, setTitle] = useState<string>(parsedValue?.meta?.title || "");
  const [description, setDescription] = useState<string>(parsedValue?.meta?.description || "");
  const [jsonPathQuery, setJsonPathQuery] = useState<string>(parsedValue?.meta?.jsonPathQuery || "");

  async function handleSubmit() {
    if (!title) {
      showToast({
        title: "Error",
        message: "A title is required",
        style: Toast.Style.Failure,
      });

      return;
    }

    setIsLoading(true);
    const newValue = { ...parsedValue, meta: { title, description, jsonPathQuery } };
    LocalStorage.removeItem(parsedValue.url);
    LocalStorage.setItem(`${parsedValue.method}-${parsedValue.url}`, JSON.stringify(newValue));
    setIsLoading(false);
    showToast({
      title: "Success",
      message: "Added metadata to request",
      style: Toast.Style.Success,
    });
    push(<Requests />);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Metadata"
            icon={Icon.AppWindowList}
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
        </ActionPanel>
      }
    >
      {/* Title */}
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Title here"
        value={title}
        onChange={(value) => setTitle(value)}
      />
      <Form.TextArea
        id="description"
        title="Short Description"
        placeholder="Short description of what this request does"
        info="Keep it short, or it will be trimmed down in the list view"
        enableMarkdown
        value={description}
        onChange={(value) => setDescription(value)}
      />
      <Form.TextField
        id="jsonpath_query"
        title="JSONPath query for copying result"
        placeholder="Put your JSON path query here. Example: $.data[0].name"
        value={jsonPathQuery}
        onChange={(value) => setJsonPathQuery(value)}
      />
    </Form>
  );
}
