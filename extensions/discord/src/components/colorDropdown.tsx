import { Form, Color, Icon } from "@raycast/api";

export function ColorDropDown() {
  return (
    <Form.Dropdown id="color" title="Color">
      <Form.Dropdown.Item title="Blue" value={Color.Blue} icon={{ source: Icon.Message, tintColor: Color.Blue }} />
      <Form.Dropdown.Item title="Green" value={Color.Green} icon={{ source: Icon.Message, tintColor: Color.Green }} />
      <Form.Dropdown.Item title="Brown" value={Color.Brown} icon={{ source: Icon.Message, tintColor: Color.Brown }} />
      <Form.Dropdown.Item
        title="Magenta"
        value={Color.Magenta}
        icon={{ source: Icon.Message, tintColor: Color.Magenta }}
      />
      <Form.Dropdown.Item
        title="Orange"
        value={Color.Orange}
        icon={{ source: Icon.Message, tintColor: Color.Orange }}
      />
      <Form.Dropdown.Item
        title="Purple"
        value={Color.Purple}
        icon={{ source: Icon.Message, tintColor: Color.Purple }}
      />
      <Form.Dropdown.Item title="Red" value={Color.Red} icon={{ source: Icon.Message, tintColor: Color.Red }} />
      <Form.Dropdown.Item
        title="Yellow"
        value={Color.Yellow}
        icon={{ source: Icon.Message, tintColor: Color.Yellow }}
      />
    </Form.Dropdown>
  );
}
