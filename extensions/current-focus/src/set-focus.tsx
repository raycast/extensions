import { Focus, getFocus, getIcon, showFocus } from "./utils";
import { Action, Form, ActionPanel, Icon } from "@raycast/api";

const icons: Exclude<Focus["icon"], undefined>[] = ["task", "browser", "email"];

export default function SetFocus(props: { arguments: { title: string } }) {
  if (props?.arguments?.title) {
    showFocus({
      text: props.arguments.title,
    });
    return null;
  }

  const focus = getFocus();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Pencil}
            title="Edit Focus"
            onSubmit={(values: Focus) => {
              return showFocus(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" defaultValue={focus.text} />
      <Form.Dropdown defaultValue="task" id="icon" title="Icon">
        {icons.map((icon) => (
          <Form.Dropdown.Item
            key={icon}
            value={icon}
            title={icon.at(0)?.toUpperCase() + icon.slice(1)}
            icon={getIcon(icon)}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
