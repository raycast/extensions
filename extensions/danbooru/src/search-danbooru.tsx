import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import DanbooruList from "./components/danbooruList";
import { DanbooruListProps } from "./types/types";

export default function Command() {
  const [tag1, setTag1] = useState<string>("");
  const [tag2, setTag2] = useState<string>("");
  const [sfw, setSfw] = useState<boolean>(true);
  const [numberOfPosts, setNumberOfPosts] = useState<string>("100");
  const { push } = useNavigation();

  function handleSubmit(values: DanbooruListProps) {
    showToast({ title: "Fetching images..." });
    push(<DanbooruList tag1={values.tag1} tag2={values.tag2} sfw={values.sfw} numberOfPosts={values.numberOfPosts} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Please enter the tags you wish to search for." />
      <Form.Description text="Tags are optional and formatted in lowercase, with underscores separating words." />
      <Form.TextField id="tag1" title="Tag 1" placeholder="Enter text" value={tag1} onChange={setTag1} />
      <Form.TextField
        id="tag2"
        title="Tag 2"
        placeholder="Enter text"
        value={tag2}
        onChange={setTag2}
        info="Danbooru limits to two tags for unauthentified and non-premium members."
      />
      <Form.Checkbox id="sfw" label="Only search for SFW images" value={sfw} onChange={setSfw} />
      <Form.Dropdown
        id="numberOfPosts"
        title="Number of posts to fetch"
        value={numberOfPosts}
        onChange={setNumberOfPosts}
        info="The higher the number, the longer the load time!"
      >
        <Form.Dropdown.Item value="1" title="1" />
        <Form.Dropdown.Item value="10" title="10" />
        <Form.Dropdown.Item value="50" title="50" />
        <Form.Dropdown.Item value="100" title="100" />
        <Form.Dropdown.Item value="200" title="200" />
      </Form.Dropdown>
    </Form>
  );
}
