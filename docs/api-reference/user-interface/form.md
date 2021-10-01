# Form

Gonna put some content here.

## API Reference

### Form

Shows a list of form items such as FormViewTextField, FormViewCheckbox or FormViewDropdown.

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| actions | `null` or `ActionPanel` | No | - | A reference to an [ActionPanel](../user-interface/action-panel.md#actionpanel). |
| children | `null` or `ReactElement<FormItemProps<FormValue>, string>` or `ReactElement<FormItemProps<FormValue>, string>[]` | No | - | The FormItemElement elements of the form. |
| isLoading | `boolean` | No | false | Indicates whether a loading bar should be shown or hidden below the search bar |
| navigationTitle | `string` | No | Command title | The main title for that view displayed in Raycast |
| submitTitle | `string` | No | - | The title of the submit action button. If no title is set, Raycast displays a default title. |
| onSubmit | <code>(input: Values) => void</code> | Yes | - |  |

### Form.Checkbox

A form item with a checkbox.

#### Example

Example of an uncontrolled checkbox:

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.Checkbox id="checkbox" label="Are you happy?" defaultValue={true} />
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `boolean` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| label | `string` | Yes | - | The label displayed on the right side of the checkbox. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `boolean` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.DatePicker

A form item with a date picker.

#### Example

Example of an uncontrolled date picker:

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.DatePicker id="dateOfBirth" title="Date of Birth" defaultValue={new Date(1955, 1, 24)} />
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `Date` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `Date` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.Dropdown

A form item with a dropdown menu.

#### Example

Example of an uncontrolled dropdown:

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.Dropdown id="emoji" title="Favorite Emoji" defaultValue="lol">
        <Form.Dropdown.Item value="poop" title="Pile of poop" icon="💩" />
        <Form.Dropdown.Item value="rocket" title="Rocket" icon="🚀" />
        <Form.Dropdown.Item value="lol" title="Rolling on the floor laughing face" icon="🤣" />
      </Form.Dropdown>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.DropdownSection` or `Form.DropdownSection[]` or `Form.DropdownItem` or `Form.DropdownItem[]` | No | - | Sections or items. If [FormDropdownItem](../user-interface/form.md#formdropdownitem) elements are specified, a default section is automatically created. |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.DropdownItem

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

#### Example

```typescript
import { Form, Icon } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.Dropdown id="icon" title="Icon">
        <Form.Dropdown.Item value="circle" title="Cirlce" icon={Icon.Circle} />
      </Form.Dropdown>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | A optional icon displayed for the item. See [ImageLike](../user-interface/icons-and-images.md#imagelike) for the supported formats and types. |
| title | `string` | Yes | - | The title displayed for the item. |
| value | `string` | Yes | - | Value of the dropdown item. Make sure to assign each unique value for each item. |

### Form.DropdownSection

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.Dropdown id="food" title="Favorite Food">
        <Form.Dropdown.Section title="Fruits">
          <Form.Dropdown.Item value="apple" title="Apple" icon="🍎" />
          <Form.Dropdown.Item value="banana" title="Banana" icon="🍌" />
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Vegetables">
          <Form.Dropdown.Item value="broccoli" title="Broccoli" icon="🥦" />
          <Form.Dropdown.Item value="carrot" title="Carrot" icon="🥕" />
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.DropdownItem` or `Form.DropdownItem[]` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the *primary* action that will be triggered by the default shortcut (ENTER), while the second item is the *secondary* action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### Form.Separator

A form item that shows a separator line.
Use for grouping and visually separating form items.

#### Example

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.TextField id="textfield" />
      <Form.Separator />
      <Form.TextArea id="textarea" />
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |


### Form.TagPicker

A form item with a tag picker that allows the user to select multiple items.

#### Example

Example of an uncontrolled tag picker:

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.TagPicker id="sports" title="Favorite Sports" defaultValue={["football"]}>
        <Form.TagPicker.Item value="basketball" title="Basketball" icon="🏀" />
        <Form.TagPicker.Item value="football" title="Football" icon="⚽️" />
        <Form.TagPicker.Item value="tennis" title="Tennis" icon="🎾" />
      </Form.TagPicker>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.TagPickerItem` or `Form.TagPickerItem[]` | No | - | The list of tag picker's items. |
| defaultValue | `string[]` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | `string` | No | - | Placeholder text shown in the token field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string[]` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.TagPickerItem

A tag picker item in a [FormTagPicker](../user-interface/form.md#formtagpicker).

#### Example

```typescript
import { Color, Form, Icon } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.TagPicker id="color" title="Color">
        <Form.TagPicker.Item value="ger" title="Germany" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
      </Form.TagPicker>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | An icon to show in the token. |
| title | `string` | Yes | - | The display title of the token. |
| value | `string` | Yes | - | Value of the tag picker item. Make sure to assign unique value for each item. |

### Form.TextArea

A form item with a text area for input.
The item supports multiline text entry.

#### Example

Example of an uncontrolled text area:

```typescript
import { Form } from "@raycast/api";

const DESCRIPTION =
  "We spend too much time starring at loading indicators. The Raycast team is dedicated to make everybody interact faster with their computers.";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.TextArea id="description" defaultValue={DESCRIPTION} />
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | `string` | No | - | Placeholder text shown in the text field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.TextField

A form item with a text field for input.

#### Example

Example of an uncontrolled text field:

```typescript
import { Form } from "@raycast/api";

export default function Command() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | `string` | No | - | Placeholder text shown in the text field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### FormValues

Values of items in the form.

For type-safe form values you can define your own interface. Use the ID's of the form items
as property name. See the example for more details.

#### Example

```typescript
import { Form } from "@raycast/api";

interface Values {
  todo: string;
  due?: Date;
}

export default function Command() {
  function handleSubmit(values: Values) {
    console.log(values);
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Form.TextField id="todo" title="Todo" />
      <Form.DatePicker id="due" title="Due Date" />
    </Form>
  );
};
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [item: string] | `any` | Yes | The form value of a given item. |

### FormValue

```typescript
FormValue: string | number | boolean | string[] | number[] | Date | null
```

A possible form item value that will be used as an input for the submit callback of a form.
