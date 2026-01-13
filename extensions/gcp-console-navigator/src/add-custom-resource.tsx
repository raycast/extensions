import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { saveCustomResource } from "./custom-data";

export default function Command() {
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [keywords, setKeywords] = useState("");
  const { pop } = useNavigation();

  async function handleSubmit() {
    if (!id.trim()) {
      showToast({ style: Toast.Style.Failure, title: "ID is required" });
      return;
    }
    if (!name.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (!path.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Path is required" });
      return;
    }
    if (!/^[A-Za-z0-9/_-]+$/.test(path.trim())) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid path",
        message:
          "Only letters, numbers, slashes, underscores, and hyphens allowed",
      });
      return;
    }

    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    await saveCustomResource({
      id: id.trim(),
      name: name.trim(),
      path: path.trim(),
      keywords: keywordList,
    });

    showToast({
      style: Toast.Style.Success,
      title: `Resource "${name}" saved`,
    });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Resource" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="id"
        title="ID"
        placeholder="my-resource"
        info="Unique identifier. Use existing ID to override (e.g., 'cloud-run-services')."
        value={id}
        onChange={setId}
      />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Resource"
        info="Display name shown in the list."
        value={name}
        onChange={setName}
      />
      <Form.TextField
        id="path"
        title="Path"
        placeholder="some/console/path"
        info="Path after console.cloud.google.com/ (without leading slash)."
        value={path}
        onChange={setPath}
      />
      <Form.TextField
        id="keywords"
        title="Keywords"
        placeholder="keyword1, keyword2"
        info="Comma-separated search keywords."
        value={keywords}
        onChange={setKeywords}
      />
    </Form>
  );
}
