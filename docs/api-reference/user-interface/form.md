# Form

Gonna put some content here.

## API Reference

### Form

Shows a list of form items such as [Form.TextField](#form.textfield), [Form.Checkbox](#form.checkbox) or [Form.Dropdown](#form.dropdown).

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| actions | <code>null</code> or <code>[ActionPanel](./action-panel.md#actionpanel)</code> | No | - | A reference to an [ActionPanel](./action-panel.md#actionpanel). |
| children | <code>null</code> or <code>ReactElement&lt;FormItemProps&lt;FormValue>, string></code> or <code>ReactElement&lt;FormItemProps&lt;FormValue>, string>[]</code> | No | - | The Form.Item elements of the form. |
| isLoading | <code>boolean</code> | No | false | Indicates whether a loading bar should be shown or hidden below the search bar |
| navigationTitle | <code>string</code> | No | Command title | The main title for that view displayed in Raycast |

### Form.Checkbox

A form item with a checkbox.

#### Example

{% tabs %}
{% tab title="Uncontrolled checkbox" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Answer" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Are you happy?" defaultValue={true} />
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled checkbox" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [checked, setChecked] = useState(true);

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Answer" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Checkbox id="answer" label="Do you like orange juice?" value={checked} onChange={setChecked} />
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | <code>boolean</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| label | <code>string</code> | Yes | - | The label displayed on the right side of the checkbox. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>boolean</code> | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.DatePicker

A form item with a date picker.

#### Example

{% tabs %}
{% tab title="Uncontrolled date picker" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="dateOfBirth" title="Date of Birth" defaultValue={new Date(1955, 1, 24)} />
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled date picker" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [date, setDate] = useState<Date>();

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="launchDate" title="Launch Date" value={date} onChange={setDate} />
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | <code>Date</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>Date</code> | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.Dropdown

A form item with a dropdown menu.

#### Example

{% tabs %}
{% tab title="Uncontrolled dropdown" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="emoji" title="Favorite Emoji" defaultValue="lol">
        <Form.Dropdown.Item value="poop" title="Pile of poop" icon="💩" />
        <Form.Dropdown.Item value="rocket" title="Rocket" icon="🚀" />
        <Form.Dropdown.Item value="lol" title="Rolling on the floor laughing face" icon="🤣" />
      </Form.Dropdown>
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled dropdown" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [programmingLanguage, setProgrammingLanguage] = useState<string>("typescript");

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="dropdown"
        title="Favorite Language"
        value={programmingLanguage}
        onChange={setProgrammingLanguage}
      >
        <Form.Dropdown.Item value="cpp" title="C++" />
        <Form.Dropdown.Item value="javascript" title="JavaScript" />
        <Form.Dropdown.Item value="ruby" title="Ruby" />
        <Form.Dropdown.Item value="python" title="Python" />
        <Form.Dropdown.Item value="swift" title="Swift" />
        <Form.Dropdown.Item value="typescript" title="TypeScript" />
      </Form.Dropdown>
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>null</code> or <code>[Form.Dropdown.Section](#form.dropdown.section)</code> or <code>Form.Dropdown.Section[]</code> or <code>[Form.Dropdown.Item](#form.dropdown.item)</code> or <code>Form.Dropdown.Item[]</code> | No | - | Sections or items. If [FormDropdownItem](#formdropdownitem) elements are specified, a default section is automatically created. |
| defaultValue | <code>string</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>string</code> | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.Dropdown.Item

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

#### Example

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Icon" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
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
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | A optional icon displayed for the item. See [ImageLike](./icons-and-images.md#imagelike) for the supported formats and types. |
| title | <code>string</code> | Yes | - | The title displayed for the item. |
| value | <code>string</code> | Yes | - | Value of the dropdown item. Make sure to assign each unique value for each item. |

### Form.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
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
| children | <code>null</code> or <code>[Form.Dropdown.Item](#form.dropdown.item)</code> or <code>Form.Dropdown.Item[]</code> | No | - | The item elements of the section. When used for the action panel, the first item in the list is the *primary* action that will be triggered by the default shortcut (ENTER), while the second item is the *secondary* action triggered by CMD + ENTER. |
| title | <code>string</code> | No | - | Title displayed above the section |

### Form.Separator

A form item that shows a separator line.
Use for grouping and visually separating form items.

#### Example

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Form" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
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

{% tabs %}
{% tab title="Uncontrolled tag picker" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Favorite" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="sports" title="Favorite Sports" defaultValue={["football"]}>
        <Form.TagPicker.Item value="basketball" title="Basketball" icon="🏀" />
        <Form.TagPicker.Item value="football" title="Football" icon="⚽️" />
        <Form.TagPicker.Item value="tennis" title="Tennis" icon="🎾" />
      </Form.TagPicker>
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled tag picker" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [countries, setCountries] = useState<string[]>(["ger", "ned", "pol"]);

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Countries" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="countries" title="Visited Countries" value={countries} onChange={setCountries}>
        <Form.TagPicker.Item value="ger" title="Germany" icon="🇩🇪" />
        <Form.TagPicker.Item value="ind" title="India" icon="🇮🇳" />
        <Form.TagPicker.Item value="ned" title="Netherlands" icon="🇳🇱" />
        <Form.TagPicker.Item value="nor" title="Norway" icon="🇳🇴" />
        <Form.TagPicker.Item value="pol" title="Poland" icon="🇵🇱" />
        <Form.TagPicker.Item value="rus" title="Russia" icon="🇷🇺" />
        <Form.TagPicker.Item value="sco" title="Scotland" icon="🏴󠁧󠁢󠁳󠁣󠁴󠁿" />
      </Form.TagPicker>
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | <code>null</code> or <code>[Form.TagPicker.Item](#form.tagpicker.item)</code> or <code>Form.TagPicker.Item[]</code> | No | - | The list of tag picker's items. |
| defaultValue | <code>string[]</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | <code>string</code> | No | - | Placeholder text shown in the token field. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>string[]</code> | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.TagPicker.Item

A tag picker item in a [FormTagPicker](#formtagpicker).

#### Example

```typescript
import { ActionPanel, Color, Form, Icon, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Color" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TagPicker id="color" title="Color">
        <Form.TagPicker.Item value="red" title="Red" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
        <Form.TagPicker.Item value="green" title="Green" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
        <Form.TagPicker.Item value="blue" title="Blue" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
      </Form.TagPicker>
    </Form>
  );
}
```

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | <code>[ImageLike](./icons-and-images.md#imagelike)</code> | No | - | An icon to show in the token. |
| title | <code>string</code> | Yes | - | The display title of the token. |
| value | <code>string</code> | Yes | - | Value of the tag picker item. Make sure to assign unique value for each item. |

### Form.TextArea

A form item with a text area for input.
The item supports multiline text entry.

#### Example

{% tabs %}
{% tab title="Uncontrolled text area" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

const DESCRIPTION =
  "We spend too much time starring at loading indicators. The Raycast team is dedicated to make everybody interact faster with their computers.";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Description" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" defaultValue={DESCRIPTION} />
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled text area" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [description, setDescription] = useState<string>();

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Description" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="description" value={description} onChange={setDescription} />
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | <code>string</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | <code>string</code> | No | - | Placeholder text shown in the text field. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>string</code> | No | - | The current value of the item. |
| onChange | <code>(newValue: Value) => void</code> | No | - |  |

### Form.TextField

A form item with a text field for input.

#### Example

{% tabs %}
{% tab title="Uncontrolled text field" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
```
{% endtab %}
{% tab title="Controlled text field" %}

```typescript
import { ActionPanel, Form, SubmitFormAction } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [name, setName] = useState<string>();

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" value={name} onChange={setName} />
    </Form>
  );
}
```
{% endtab %}
{% endtabs %}

#### Props

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | <code>string</code> | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | <code>string</code> | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | <code>string</code> | No | - | Placeholder text shown in the text field. |
| storeValue | <code>boolean</code> | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | <code>string</code> | No | - | The title displayed on the left side of the item. |
| value | <code>string</code> | No | - | The current value of the item. |
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
    <Form
       actions={
         <ActionPanel>
           <SubmitFormAction title="Submit" onSubmit={handleSubmit} />
         </ActionPanel>
       }
    >
      <Form.TextField id="todo" title="Todo" />
      <Form.DatePicker id="due" title="Due Date" />
    </Form>
  );
};
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| [item: string] | <code>any</code> | Yes | The form value of a given item. |

### FormValue

```typescript
FormValue: string | number | boolean | string[] | number[] | Date | null
```

A possible form item value that will be used as an input for the submit callback of a form.
