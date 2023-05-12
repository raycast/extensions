import { ActionPanel, Form } from "@raycast/api";
import { HealthCheck, TagPickerWithAddTag } from "./shared";
import { useState } from "react";

export default function Command() {
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <HealthCheck onLoading={setLoading}>
      <Form isLoading={loading} actions={<ActionPanel></ActionPanel>}>
        <TagPickerWithAddTag id="tags" title="Tags">
          {["tag1", "tag2", "tag3"]}
        </TagPickerWithAddTag>
      </Form>
    </HealthCheck>
  );
}
