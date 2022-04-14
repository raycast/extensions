import { Form, ActionPanel, Action, showToast, Icon, Color, Toast, popToRoot } from "@raycast/api";
import { Item } from "./types";
import { getItems, saveItems } from "./storage";
import { nanoid } from "nanoid";

export default function Command() {
  async function handleSubmit(item: Item) {
    validateItem(item);

    const existingItems = await getItems();
    existingItems.push({ ...item, id: nanoid() });

    popToRoot();
    saveItems(existingItems);
    showToast({ title: "Success", message: "Successfully added item" });
  }

  function validateItem(item: Item) {
    if (item.name === "") {
      showToast(Toast.Style.Failure, "An error occurred", "Name can not be empty");
      return false;
    }

    if (item.date === null) {
      showToast(Toast.Style.Failure, "An error occurred", "Please select a date");
      return false;
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
      <Form.TextField id="name" title="Name" placeholder="Enter Name" />
      <Form.TextField id="subtitle" title="Subtitle" placeholder="Enter Subtitle (optional)" />
      <Form.DatePicker id="date" title="Date" />
      <Form.Dropdown id="icon" title="Icon" defaultValue="">
        <Form.Dropdown.Item value="" title="No Icon" />
        {Object.entries(Icon).map(([k, v]) => (
          <Form.Dropdown.Item value={v} key={k} title={k} icon={v} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="color" title="Color" defaultValue="">
        <Form.Dropdown.Item value="" title="No Color" />
        {Object.entries(Color).map(([k, v]) => (
          <Form.Dropdown.Item value={v} key={k} title={k} icon={{ source: Icon.Dot, tintColor: v }} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
