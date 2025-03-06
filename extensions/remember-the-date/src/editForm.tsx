import { Item } from "./types";
import { validateItem } from "./utils";
import { ActionPanel, Action, Form, Icon, Color, showToast, Toast, useNavigation } from "@raycast/api";

export function EditForm(props: { item: Item; onEdit: (item: Item) => void }) {
  const { pop } = useNavigation();
  const item: Item = props.item;

  async function handleSubmit(values: Item) {
    if (validateItem(values)) {
      props.onEdit({ ...values, id: item.id });

      showToast({ style: Toast.Style.Success, title: "Successfully updated item" });
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={item.name} placeholder="Enter Name" />
      <Form.TextField
        id="subtitle"
        defaultValue={item.subtitle}
        title="Subtitle"
        placeholder="Enter Subtitle (optional)"
      />
      <Form.DatePicker id="date" defaultValue={new Date(item.date)} title="Date" />
      <Form.Dropdown id="icon" title="Icon" defaultValue={item.icon}>
        {Object.entries(Icon).map(([key, value]) => (
          <Form.Dropdown.Item value={value} key={key} title={key} icon={value} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Color" defaultValue={item.color}>
        <Form.Dropdown.Item value="" title="No Color" />
        {Object.entries(Color).map(([key, value]) => (
          <Form.Dropdown.Item value={`${value}`} key={key} title={key} icon={{ source: Icon.Dot, tintColor: value }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
