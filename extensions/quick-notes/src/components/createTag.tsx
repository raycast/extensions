import { Form, ActionPanel, Action, showToast, useNavigation } from "@raycast/api";
import { useAtom } from "jotai";
import { tagsAtom } from "../services/atoms";
import { colors, getRandomColor, getTintColor } from "../utils/utils";
import { useState } from "react";
import { useForm } from "@raycast/utils";

type TagForm = {
  name: string;
  color: string;
};

const CreateTag = () => {
  const [tags, setTag] = useAtom(tagsAtom);
  const { pop } = useNavigation();
  const [color, setColor] = useState(getRandomColor().name);

  const { handleSubmit, itemProps } = useForm<TagForm>({
    async onSubmit(values) {
      setTag([...tags, { name: values.name, color }]);
      showToast({ title: "Tag Saved" });
      pop();
    },
    validation: {
      name: (value) => {
        if (!value) {
          return "Tag is required";
        } else if (value.length > 100) {
          return "Tag < 100 chars";
        } else if (tags.find((tag) => tag.name.toLocaleLowerCase() === value.toLocaleLowerCase())) {
          return "Tag already exists";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Tag"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Tag" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="New Tag" />
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.Dropdown title="Color" {...itemProps.color} value={color} onChange={setColor}>
        {Object.values(colors).map((color, i) => (
          <Form.Dropdown.Item
            key={i}
            value={color.name}
            title={color.name}
            icon={{ source: "dot.png", tintColor: color.tintColor }}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Description text="Existing Tags" />
      <Form.Dropdown id="tags" info="For referencing existing tags only">
        {tags.map((t, i) => (
          <Form.Dropdown.Item
            key={i}
            value={t.name}
            title={t.name}
            icon={{ source: "dot.png", tintColor: getTintColor(t.color) }}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export default CreateTag;
