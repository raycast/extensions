import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { TagForm, useTag } from "./features/tag";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { createTag } = useTag();

  async function handleSubmit(values: { name: string; color: string }) {
    const { name, color } = values;

    if (!name) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a tag name",
      });
      return;
    }

    if (name.length > 10) {
      showToast({
        style: Toast.Style.Failure,
        title: "Tag name must be 10 characters or less",
      });
      return;
    }

    if (!/^[a-zA-Z0-9-]+$/.test(name)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Tag name can only contain alphanumeric characters and hyphens",
      });
      return;
    }

    setIsLoading(true);
    await createTag({ name, color });
    setIsLoading(false);
  }

  return <TagForm onSubmit={handleSubmit} onCancel={() => {}} submitTitle="Add Tag" isLoading={isLoading} />;
}
