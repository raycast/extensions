# Form

Our `Form` component provides great user experience to collect some data from a user and submit it for extensions needs.

![](../../.gitbook/assets/example-doppler-share-secrets.webp)

## Two Types of Items: Controlled vs. Uncontrolled

Items in React can be one of two types: controlled or uncontrolled.

An uncontrolled item is the simpler of the two. It's the closest to a plain HTML input. React puts it on the page, and Raycast keeps track of the rest. Uncontrolled inputs require less code, but make it harder to do certain things.

With a controlled item, YOU explicitly control the `value` that the item displays. You have to write code to respond to changes with defining `onChange` callback, store the current `value` somewhere, and pass that value back to the item to be displayed. It's a feedback loop with your code in the middle. It's more manual work to wire these up, but they offer the most control.

You can take look at these two styles below under each of the supported items.

## Validation

Before submitting data, it is important to ensure all required form controls are filled out, in the correct format.

In Raycast, validation can be fully controlled from the API. To keep the same behavior as we have natively, the proper way of usage is to validate a `value` in the `onBlur` callback, update the `error` of the item and keep track of updates with the `onChange` callback to drop the `error` value. The [useForm](../../utils-reference/react-hooks/useForm.md) utils hook nicely wraps this behaviour and is the recommended way to do deal with validations.

![](../../.gitbook/assets/form-validation.webp)

{% hint style="info" %}
Keep in mind that if the Form has any errors, the [`Action.SubmitForm`](./actions.md#action.submitform) `onSubmit` callback won't be triggered.
{% endhint %}

#### Example

{% tabs %}

{% tab title="FormValidationWithUtils.tsx" %}

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface SignUpFormValues {
  name: string;
  password: string;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.name} account created`,
      });
    },
    validation: {
      name: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 8) {
          return "Password must be at least 8 symbols";
        } else if (!value) {
          return "The item is required";
        }
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Full Name" placeholder="Tim Cook" {...itemProps.name} />
      <Form.PasswordField title="New Password" {...itemProps.password} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="FormValidationWithoutUtils.tsx" %}

```typescript
import { Form } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function dropPasswordErrorIfNeeded() {
    if (passwordError && passwordError.length > 0) {
      setPasswordError(undefined);
    }
  }

  return (
    <Form>
      <Form.TextField
        id="nameField"
        title="Full Name"
        placeholder="Tim Cook"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.PasswordField
        id="password"
        title="New Password"
        error={passwordError}
        onChange={dropPasswordErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;
          if (value && value.length > 0) {
            if (!validatePassword(value)) {
              setPasswordError("Password should be at least 8 characters!");
            } else {
              dropPasswordErrorIfNeeded();
            }
          } else {
            setPasswordError("The field should't be empty!");
          }
        }}
      />
      <Form.TextArea id="bioTextArea" title="Add Bio" placeholder="Describe who you are" />
      <Form.DatePicker id="birthDate" title="Date of Birth" />
    </Form>
  );
}

function validatePassword(value: string): boolean {
  return value.length >= 8;
}
```

{% endtab %}

{% endtabs %}

## Drafts

Drafts are a mechanism to preserve filled-in inputs (but not yet submitted) when an end-user exits the command. To enable this mechanism, set the `enableDrafts` prop on your Form and populate the initial values of the Form with the [top-level prop `draftValues`](../../information/lifecycle/README.md#launchprops).

![](../../.gitbook/assets/form-drafts.webp)

{% hint style="info" %}

- Drafts for forms nested in navigation are not supported yet. In this case, you will see a warning about it.
- Drafts won't preserve the [`Form.Password`](form.md#form.passwordfield)'s values.
- Drafts will be dropped once [`Action.SubmitForm`](./actions.md#action.submitform) is triggered.
- If you call [`popToRoot()`](../window-and-search-bar.md#poptoroot), drafts won't be preserved or updated.

{% endhint %}

#### Example

{% tabs %}
{% tab title="Uncontrolled Form" %}

```typescript
import { Form, ActionPanel, Action, popToRoot, LaunchProps } from "@raycast/api";

interface TodoValues {
  title: string;
  description?: string;
  dueDate?: Date;
}

export default function Command(props: LaunchProps<{ draftValues: TodoValues }>) {
  const { draftValues } = props;

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: TodoValues) => {
              console.log("onSubmit", values);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={draftValues?.title} />
      <Form.TextArea id="description" title="Description" defaultValue={draftValues?.description} />
      <Form.DatePicker id="dueDate" title="Due Date" defaultValue={draftValues?.dueDate} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled Form" %}

```typescript
import { Form, ActionPanel, Action, popToRoot, LaunchProps } from "@raycast/api";
import { useState } from "react";

interface TodoValues {
  title: string;
  description?: string;
  dueDate?: Date;
}

export default function Command(props: LaunchProps<{ draftValues: TodoValues }>) {
  const { draftValues } = props;

  const [title, setTitle] = useState<string>(draftValues?.title || "");
  const [description, setDescription] = useState<string>(draftValues?.description || "");
  const [dueDate, setDueDate] = useState<Date | null>(draftValues?.dueDate || null);

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: TodoValues) => {
              console.log("onSubmit", values);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextArea id="description" title="Description" value={description} onChange={setDescription} />
      <Form.DatePicker id="dueDate" title="Due Date" value={dueDate} onChange={setDueDate} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

## API Reference

### Form

Shows a list of form items such as [Form.TextField](form.md#form.textfield), [Form.Checkbox](form.md#form.checkbox) or [Form.Dropdown](form.md#form.dropdown).

Optionally add a [Form.LinkAccessory](form.md#form.linkaccessory) in the right-hand side of the navigation bar.

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| actions | A reference to an ActionPanel. | <code>React.ReactNode</code> | - |
| children | The Form.Item elements of the form. | <code>React.ReactNode</code> | - |
| enableDrafts | Defines whether the Form.Items values will be preserved when user exits the screen. | <code>boolean</code> | - |
| isLoading | Indicates whether a loading bar should be shown or hidden below the search bar | <code>boolean</code> | - |
| navigationTitle | The main title for that view displayed in Raycast | <code>string</code> | - |
| searchBarAccessory | Form.LinkAccessory that will be shown in the right-hand-side of the search bar. | <code>ReactElement&lt;[Form.LinkAccessory.Props](form.md#props), string></code> | - |

### Form.TextField

A form item with a text field for input.

![](../../.gitbook/assets/form-textfield.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled text field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [name, setName] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| placeholder | Placeholder text shown in the text field. | <code>string</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.PasswordField

A form item with a secure text field for password-entry in which the entered characters must be kept secret.

![](../../.gitbook/assets/form-password.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled password field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Password" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" title="Enter Password" />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled password field" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [password, setPassword] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Password" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="password" value={password} onChange={setPassword} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| placeholder | Placeholder text shown in the password field. | <code>string</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.TextArea

A form item with a text area for input. The item supports multiline text entry.

![](../../.gitbook/assets/form-textarea.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled text area" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

const DESCRIPTION =
  "We spend too much time staring at loading indicators. The Raycast team is dedicated to make everybody interact faster with their computers.";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Description" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [description, setDescription] = useState<string>("");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Description" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string</code> | - |
| enableMarkdown | Whether markdown will be highlighted in the TextArea or not.  When enabled, markdown shortcuts starts to work for the TextArea (pressing `⌘ + B` will add `**bold**` around the selected text, `⌘ + I` will make the selected text italic, etc.) | <code>boolean</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| placeholder | Placeholder text shown in the text area. | <code>string</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Checkbox

A form item with a checkbox.

![](../../.gitbook/assets/form-checkbox.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled checkbox" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [checked, setChecked] = useState(true);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Answer" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| label<mark style="color:red;">*</mark> | The label displayed on the right side of the checkbox. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>boolean</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;boolean>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: boolean) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;boolean>) => void</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>boolean</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.DatePicker

A form item with a date picker.

![](../../.gitbook/assets/form-datepicker.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled date picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [date, setDate] = useState<Date | null>(null);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| max | The maximum date (inclusive) allowed for selection.    - If the PickDate type is `Type.Date`, only the full day date will be considered for comparison, ignoring the time components of the Date object.  - If the PickDate type is `Type.DateTime`, both date and time components will be considered for comparison.    The date should be a JavaScript Date object. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)</code> | - |
| min | The minimum date (inclusive) allowed for selection.    - If the PickDate type is `Type.Date`, only the full day date will be considered for comparison, ignoring the time components of the Date object.  - If the PickDate type is `Type.DateTime`, both date and time components will be considered for comparison.    The date should be a JavaScript Date object. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)>) => void</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| type | Indicates what types of date components can be picked    Defaults to Form.DatePicker.Type.DateTime | <code>[Form.DatePicker.Type](form.md#form.datepicker.type)</code> | - |
| value | The current value of the item. | <code>[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

#### Form.DatePicker.isFullDay

A method that determines if a given date represents a full day or a specific time.

```ts
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Event"
            onSubmit={(values) => {
              if (Form.DatePicker.isFullDay(values.reminderDate)) {
                // the event is for a full day
              } else {
                // the event is at a specific time
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.DatePicker id="eventTitle" title="Title" />
      <Form.DatePicker id="eventDate" title="Date" />
    </Form>
  );
}
```

### Form.Dropdown

A form item with a dropdown menu.

![](../../.gitbook/assets/form-dropdown.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled dropdown" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [programmingLanguage, setProgrammingLanguage] = useState<string>("typescript");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| children | Sections or items. If Form.Dropdown.Item elements are specified, a default section is automatically created. | <code>React.ReactNode</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| filtering | Toggles Raycast filtering. When `true`, Raycast will use the query in the search bar to filter the  items. When `false`, the extension needs to take care of the filtering.    You can further define how native filtering orders sections by setting an object with a `keepSectionOrder` property:  When `true`, ensures that Raycast filtering maintains the section order as defined in the extension.  When `false`, filtering may change the section order depending on the ranking values of items. | <code>boolean</code> or <code>{ keepSectionOrder: boolean }</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| isLoading | Indicates whether a loading indicator should be shown or hidden next to the search bar | <code>boolean</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string>) => void</code> | - |
| onSearchTextChange | Callback triggered when the search bar text changes. | <code>(text: string) => void</code> | - |
| placeholder | Placeholder text that will be shown in the dropdown search field. | <code>string</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| throttle | Defines whether the `onSearchTextChange` handler will be triggered on every keyboard press or with a delay for throttling the events.  Recommended to set to `true` when using custom filtering logic with asynchronous operations (e.g. network requests). | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Dropdown.Item

A dropdown item in a [Form.Dropdown](form.md#form.dropdown)

#### Example

```typescript
import { Action, ActionPanel, Form, Icon } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Icon" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The title displayed for the item. | <code>string</code> | - |
| value<mark style="color:red;">*</mark> | Value of the dropdown item.  Make sure to assign each unique value for each item. | <code>string</code> | - |
| icon | A optional icon displayed for the item. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |
| keywords | An optional property used for providing additional indexable strings for search.  When filtering the items in Raycast, the keywords will be searched in addition to the title. | <code>string[]</code> | - |

### Form.Dropdown.Section

Visually separated group of dropdown items.

Use sections to group related menu items together.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| children | The item elements of the section. | <code>React.ReactNode</code> | - |
| title | Title displayed above the section | <code>string</code> | - |

### Form.TagPicker

A form item with a tag picker that allows the user to select multiple items.

![](../../.gitbook/assets/form-tagpicker.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled tag picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Favorite" onSubmit={(values) => console.log(values)} />
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
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [countries, setCountries] = useState<string[]>(["ger", "ned", "pol"]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Countries" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| children | The list of tags. | <code>React.ReactNode</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string[]</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string[]>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string[]) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string[]>) => void</code> | - |
| placeholder | Placeholder text shown in the token field. | <code>string</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string[]</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.TagPicker.Item

A tag picker item in a [Form.TagPicker](form.md#form.tagpicker).

#### Example

```typescript
import { ActionPanel, Color, Form, Icon, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Color" onSubmit={(values) => console.log(values)} />
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

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The display title of the tag. | <code>string</code> | - |
| value<mark style="color:red;">*</mark> | Value of the tag.  Make sure to assign unique value for each item. | <code>string</code> | - |
| icon | An icon to show in the tag. | <code>[Image.ImageLike](icons-and-images.md#image.imagelike)</code> | - |

### Form.Separator

A form item that shows a separator line. Use for grouping and visually separating form items.

![](../../.gitbook/assets/form-separator.webp)

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Form" onSubmit={(values) => console.log(values)} />
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

### Form.FilePicker

A form item with a button to open a dialog to pick some files and/or some directories (depending on its props).

{% hint style="info" %}
While the user picked some items that existed, it might be possible for them to be deleted or changed when the `onSubmit` callback is called. Hence you should always make sure that the items exist before acting on them!
{% endhint %}

![](../../.gitbook/assets/form-filepicker-multiple.webp)

![Single Selection](../../.gitbook/assets/form-filepicker-single.webp)

#### Example

{% tabs %}
{% tab title="Uncontrolled file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { files: string[] }) => {
              const files = values.files.filter((file: any) => fs.existsSync(file) && fs.lstatSync(file).isFile());
              console.log(files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Single selection file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { files: string[] }) => {
              const file = values.files[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              console.log(file);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" allowMultipleSelection={false} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Directory picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import fs from "fs";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Name"
            onSubmit={(values: { folders: string[] }) => {
              const folder = values.folders[0];
              if (!fs.existsSync(folder) || fs.lstatSync(folder).isDirectory()) {
                return false;
              }
              console.log(folder);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="folders" allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    </Form>
  );
}
```

{% endtab %}

{% tab title="Controlled file picker" %}

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" value={files} onChange={setFiles} />
    </Form>
  );
}
```

{% endtab %}
{% endtabs %}

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| id<mark style="color:red;">*</mark> | ID of the form item.  Make sure to assign each form item a unique id. | <code>string</code> | - |
| allowMultipleSelection | Indicates whether the user can select multiple items or only one. | <code>boolean</code> | - |
| autoFocus | Indicates whether the item should be focused automatically once the form is rendered. | <code>boolean</code> | - |
| canChooseDirectories | Indicates whether it's possible to choose a directory. | <code>boolean</code> | - |
| canChooseFiles | Indicates whether it's possible to choose a file. | <code>boolean</code> | - |
| defaultValue | The default value of the item.  Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering.    If you're using `storeValue` and configured it as `true` then the stored value will be set.    If you configure `value` at the same time with `defaultValue`, the `value` will be set instead of `defaultValue`. | <code>string[]</code> | - |
| error | An optional error message to show the form item validation issues.  If the `error` is present, the Form Item will be highlighted with red border and will show an error message on the right. | <code>string</code> | - |
| info | An optional info message to describe the form item. It appears on the right side of the item with an info icon. When the icon is hovered, the info message is shown. | <code>string</code> | - |
| onBlur | The callback that will be triggered when the item loses its focus. | <code>(event: FormEvent&lt;string[]>) => void</code> | - |
| onChange | The callback which will be triggered when the `value` of the item changes. | <code>(newValue: string[]) => void</code> | - |
| onFocus | The callback which will be triggered should be called when the item is focused. | <code>(event: FormEvent&lt;string[]>) => void</code> | - |
| showHiddenFiles | Indicates whether the file picker displays files that are normally hidden from the user. | <code>boolean</code> | - |
| storeValue | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. | <code>boolean</code> | - |
| title | The title displayed on the left side of the item. | <code>string</code> | - |
| value | The current value of the item. | <code>string[]</code> | - |

#### Methods (Imperative API)

| Name  | Signature               | Description                                                                |
| ----- | ----------------------- | -------------------------------------------------------------------------- |
| focus | <code>() => void</code> | Makes the item request focus.                                              |
| reset | <code>() => void</code> | Resets the form item to its initial value, or `defaultValue` if specified. |

### Form.Description

A form item with a simple text label.

Do _not_ use this component to show validation messages for other form fields.

![](../../.gitbook/assets/form-description.webp)

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import / Export"
        text="Exporting will back-up your preferences, quicklinks, snippets, floating notes, script-command folder paths, aliases, hotkeys, favorites and other data."
      />
    </Form>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| text<mark style="color:red;">*</mark> | Text that will be displayed in the middle. | <code>string</code> | - |
| title | The display title of the left side from the description item. | <code>string</code> | - |

### Form.LinkAccessory

A link that will be shown in the right-hand side of the navigation bar.

#### Example

```typescript
import { ActionPanel, Form, Action } from "@raycast/api";

export default function Command() {
  return (
    <Form
      searchBarAccessory={
        <Form.LinkAccessory
          target="https://developers.raycast.com/api-reference/user-interface/form"
          text="Open Documentation"
        />
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Name" onSubmit={(values) => console.log(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" defaultValue="Steve" />
    </Form>
  );
}
```

#### Props

| Prop | Description | Type | Default |
| :--- | :--- | :--- | :--- |
| target<mark style="color:red;">*</mark> | The target of the link. | <code>string</code> | - |
| text<mark style="color:red;">*</mark> | The text value of the item. | <code>string</code> | - |

## Types

#### Form.Event

Some Form.Item callbacks (like `onFocus` and `onBlur`) can return a `Form.Event` object that you can use in a different ways.

| Property | Description | Type |
| :--- | :--- | :--- |
| target<mark style="color:red;">*</mark> | An interface containing target data related to the event | <code>{ id: string; value?: any }</code> |
| type<mark style="color:red;">*</mark> | A type of event | <code>[Form.Event.Type](form.md#form.event.type)</code> |

#### Example

```typescript
import { Form } from "@raycast/api";

export default function Main() {
  return (
    <Form>
      <Form.TextField id="textField" title="Text Field" onBlur={logEvent} onFocus={logEvent} />
      <Form.TextArea id="textArea" title="Text Area" onBlur={logEvent} onFocus={logEvent} />
      <Form.Dropdown id="dropdown" title="Dropdown" onBlur={logEvent} onFocus={logEvent}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <Form.Dropdown.Item value={String(num)} title={String(num)} key={num} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker id="tagPicker" title="Tag Picker" onBlur={logEvent} onFocus={logEvent}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <Form.TagPicker.Item value={String(num)} title={String(num)} key={num} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function logEvent(event: Form.Event<string[] | string>) {
  console.log(`Event '${event.type}' has happened for '${event.target.id}'. Current 'value': '${event.target.value}'`);
}
```

#### Form.Event.Type

The different types of [`Form.Event`](form.md#form.event). Can be `"focus"` or `"blur"`.

### Form.Values

Values of items in the form.

For type-safe form values, you can define your own interface. Use the ID's of the form items as the property name.

#### Example

```typescript
import { Form, Action, ActionPanel } from "@raycast/api";

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
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="todo" title="Todo" />
      <Form.DatePicker id="due" title="Due Date" />
    </Form>
  );
}
```

#### Properties

| Name              | Type  | Required | Description                     |
| ----------------- | ----- | -------- | ------------------------------- |
| \[itemId: string] | `any` | Yes      | The form value of a given item. |

### Form.DatePicker.Type

The types of date components the user can pick with a `Form.DatePicker`.

#### Enumeration members

| Name     | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| DateTime | Hour and second can be picked in addition to year, month and day |
| Date     | Only year, month, and day can be picked                          |

---

## Imperative API

You can use React's [useRef](https://reactjs.org/docs/hooks-reference.html#useref) hook to create variables which have access to imperative APIs (such as `.focus()` or `.reset()`) exposed by the native form items.

```typescript
import { useRef } from "react";
import { ActionPanel, Form, Action } from "@raycast/api";

interface FormValues {
  nameField: string;
  bioTextArea: string;
  datePicker: string;
}

export default function Command() {
  const textFieldRef = useRef<Form.TextField>(null);
  const textAreaRef = useRef<Form.TextArea>(null);
  const datePickerRef = useRef<Form.DatePicker>(null);
  const passwordFieldRef = useRef<Form.PasswordField>(null);
  const dropdownRef = useRef<Form.Dropdown>(null);
  const tagPickerRef = useRef<Form.TagPicker>(null);
  const firstCheckboxRef = useRef<Form.Checkbox>(null);
  const secondCheckboxRef = useRef<Form.Checkbox>(null);

  async function handleSubmit(values: FormValues) {
    console.log(values);
    datePickerRef.current?.focus();
    dropdownRef.current?.reset();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Focus">
            <Action title="Focus TextField" onAction={() => textFieldRef.current?.focus()} />
            <Action title="Focus TextArea" onAction={() => textAreaRef.current?.focus()} />
            <Action title="Focus DatePicker" onAction={() => datePickerRef.current?.focus()} />
            <Action title="Focus PasswordField" onAction={() => passwordFieldRef.current?.focus()} />
            <Action title="Focus Dropdown" onAction={() => dropdownRef.current?.focus()} />
            <Action title="Focus TagPicker" onAction={() => tagPickerRef.current?.focus()} />
            <Action title="Focus First Checkbox" onAction={() => firstCheckboxRef.current?.focus()} />
            <Action title="Focus Second Checkbox" onAction={() => secondCheckboxRef.current?.focus()} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Reset">
            <Action title="Reset TextField" onAction={() => textFieldRef.current?.reset()} />
            <Action title="Reset TextArea" onAction={() => textAreaRef.current?.reset()} />
            <Action title="Reset DatePicker" onAction={() => datePickerRef.current?.reset()} />
            <Action title="Reset PasswordField" onAction={() => passwordFieldRef.current?.reset()} />
            <Action title="Reset Dropdown" onAction={() => dropdownRef.current?.reset()} />
            <Action title="Reset TagPicker" onAction={() => tagPickerRef.current?.reset()} />
            <Action title="Reset First Checkbox" onAction={() => firstCheckboxRef.current?.reset()} />
            <Action title="Reset Second Checkbox" onAction={() => secondCheckboxRef.current?.reset()} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField id="textField" title="TextField" ref={textFieldRef} />
      <Form.TextArea id="textArea" title="TextArea" ref={textAreaRef} />
      <Form.DatePicker id="datePicker" title="DatePicker" ref={datePickerRef} />
      <Form.PasswordField id="passwordField" title="PasswordField" ref={passwordFieldRef} />
      <Form.Separator />
      <Form.Dropdown
        id="dropdown"
        title="Dropdown"
        defaultValue="first"
        onChange={(newValue) => {
          console.log(newValue);
        }}
        ref={dropdownRef}
      >
        <Form.Dropdown.Item value="first" title="First" />
        <Form.Dropdown.Item value="second" title="Second" />
      </Form.Dropdown>
      <Form.Separator />
      <Form.TagPicker
        id="tagPicker"
        title="TagPicker"
        ref={tagPickerRef}
        onChange={(t) => {
          console.log(t);
        }}
      >
        {["one", "two", "three"].map((tag) => (
          <Form.TagPicker.Item key={tag} value={tag} title={tag} />
        ))}
      </Form.TagPicker>
      <Form.Separator />
      <Form.Checkbox
        id="firstCheckbox"
        title="First Checkbox"
        label="First Checkbox"
        ref={firstCheckboxRef}
        onChange={(checked) => {
          console.log("first checkbox onChange ", checked);
        }}
      />
      <Form.Checkbox
        id="secondCheckbox"
        title="Second Checkbox"
        label="Second Checkbox"
        ref={secondCheckboxRef}
        onChange={(checked) => {
          console.log("second checkbox onChange ", checked);
        }}
      />
      <Form.Separator />
    </Form>
  );
}
```
