# `useForm`

Hook that provides a high-level interface to work with Forms, and more particularly, with Form validations. It incorporates all the good practices to provide a great User Experience for your Forms.

## Signature

```ts
function useForm<T extends Form.Values>(props: {
  onSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  initialValues?: Partial<T>;
  validation?: {
    [id in keyof T]?: ((value: T[id]) => string | undefined | null) | FormValidation;
  };
}): {
  handleSubmit: (values: T) => void | boolean | Promise<void | boolean>;
  itemProps: {
    [id in keyof T]: Partial<Form.ItemProps<T[id]>> & {
      id: string;
    };
  };
  setValidationError: (id: keyof T, error: ValidationError) => void;
  setValue: <K extends keyof T>(id: K, value: T[K]) => void;
  values: T;
  focus: (id: keyof T) => void;
  reset: (initialValues?: Partial<T>) => void;
};
```

### Arguments

- `onSubmit` is a callback that will be called when the form is submitted and all validations pass.

With a few options:

- `initialValues` are the initial values to set when the Form is first rendered.
- `validation` are the validation rules for the Form. A validation for a Form item is a function that takes the current value of the item as an argument and must return a string when the validation is failing. We also provide some shorthands for common cases, see [FormValidation](#formvalidation).

### Return

Returns an object which contains the necessary methods and props to provide a good User Experience in your Form.

- `handleSubmit` is a function to pass to the `onSubmit` prop of the `<Action.SubmitForm>` element. It wraps the initial `onSubmit` argument with some goodies related to the validation.
- `itemProps` are the props that must be passed to the `<Form.Item>` elements to handle the validations.

It also contains some additions for easy manipulation of the Form's data.

- `values` is the current values of the Form.
- `setValue` is a function that can be used to programmatically set the value of a specific field.
- `setValidationError` is a function that can be used to programmatically set the validation of a specific field.
- `focus` is a function that can be used to programmatically focus a specific field.
- `reset` is a function that can be used to reset the values of the Form. Optionally, you can specify the values to set when the Form is reset.

## Example

```tsx
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface SignUpFormValues {
  firstName: string;
  lastName: string;
  birthday: Date | null;
  password: string;
  number: string;
  hobbies: string[];
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<SignUpFormValues>({
    onSubmit(values) {
      showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `${values.firstName} ${values.lastName} account created`,
      });
    },
    validation: {
      firstName: FormValidation.Required,
      lastName: FormValidation.Required,
      password: (value) => {
        if (value && value.length < 8) {
          return "Password must be at least 8 symbols";
        } else if (!value) {
          return "The item is required";
        }
      },
      number: (value) => {
        if (value && value !== "2") {
          return "Please select '2'";
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
      <Form.TextField title="First Name" placeholder="Enter first name" {...itemProps.firstName} />
      <Form.TextField title="Last Name" placeholder="Enter last name" {...itemProps.lastName} />
      <Form.DatePicker title="Date of Birth" {...itemProps.birthday} />
      <Form.PasswordField
        title="Password"
        placeholder="Enter password at least 8 characters long"
        {...itemProps.password}
      />
      <Form.Dropdown title="Your Favorite Number" {...itemProps.number}>
        {[1, 2, 3, 4, 5, 6, 7].map((num) => {
          return <Form.Dropdown.Item value={String(num)} title={String(num)} key={num} />;
        })}
      </Form.Dropdown>
    </Form>
  );
}
```

## Types

### FormValidation

Shorthands for common validation cases

#### Enumeration members

| Name     | Description                                       |
| :------- | :------------------------------------------------ |
| Required | Show an error when the value of the item is empty |
