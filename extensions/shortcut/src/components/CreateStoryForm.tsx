import { Form } from "@raycast/api";
import { useMembers } from "../hooks";

export default function CreateStoryForm() {
  const { data: members } = useMembers();

  return (
    <Form enableDrafts>
      <Form.TextField title="Story Name" id="name" />
    </Form>
  );
}
