# Form

Gonna put some content here.

## API Reference

### Form

Shows a list of form items such as FormViewTextField, FormViewCheckbox or FormViewDropdown.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `ReactElement<FormItemProps<FormValue>, string>` or `ReactElement<FormItemProps<FormValue>, string>[]` | No | - | The FormItemElement elements of the form. |
| isLoading | `boolean` | No | - | Indicates whether a loading bar should be shown or hidden below the search bar |
| navigationTitle | `string` | No | - | The main title for that view displayed in Raycast |
| submitTitle | `string` | No | - | The title of the submit action button. If no title is set, Raycast displays a default title. |
| onSubmit | `(input: FormValues) => void` | Yes | - |  |

### Form.Checkbox

A form item with a checkbox.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `boolean` | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| label | `string` | Yes | - | The label displayed on the right side of the checkbox. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `boolean` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.DatePicker

A form item with a date picker.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| dateFormat | `string` | No | - | The date format string to be used for FormViewDatePicker.value. The default format is ISO 8601 \("yyyy-MM-dd'T'HH:mm:ssXXXXX"\). |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.Dropdown

A form item with a dropdown menu.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or [`Form.DropdownSection`](form.md#form-dropdownsection) or `Form.DropdownSection[]` or [`Form.DropdownItem`](form.md#form-dropdownitem) or `Form.DropdownItem[]` | No | - | Sections or items. If [FormDropdownItem](form.md#form-dropdownitem) elements are specified, a default section is automatically created. |
| defaultValue | [`DropdownValue`](form.md#dropdownvalue) | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | [`DropdownValue`](form.md#dropdownvalue) | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.DropdownItem

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | - | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| title | `string` | Yes | - | The title displayed for the item. |
| value | [`DropdownValue`](form.md#dropdownvalue) | Yes | - | Value of the dropdown item. Make sure to assign each unique value for each item |

### Form.DropdownSection

Visually separated group of items. Use sections to group related menu items together.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or [`Form.DropdownItem`](form.md#form-dropdownitem) or `Form.DropdownItem[]` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the _primary_ action that will be triggered by the default shortcut \(ENTER\), while the second item is the _secondary_ action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### FormSeparator

A form item that shows a separator line. Use for grouping and visually separating form items.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |


### Form.TagPicker

A form item with a tag picker that allows the user to select multiple items.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or [`Form.TagPickerItem`](form.md#form-tagpickeritem) or `Form.TagPickerItem[]` | No | - | The list of tag picker's items. |
| defaultValue | [`PickerValue`](form.md#pickervalue) | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| placeholder | `string` | No | - | Placeholder text shown in the token field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | [`PickerValue`](form.md#pickervalue) | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.TagPickerItem

A tag picker item in a [FormTagPicker](form.md#form-tagpicker).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | [`ImageLike`](icons-and-images.md#imagelike) | No | - | An icon to show in the token. |
| title | `string` | Yes | - | The display title of the token. |
| value | [`PickerItemValue`](form.md#pickeritemvalue) | Yes | - | Value of the tag picker item. Make sure to assign unique value for each item. |

### Form.TextArea

A form item with a text area for input. The item supports multiline text entry.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| placeholder | `string` | No | - | Placeholder text shown in the text field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.TextField

A form item with a text field for input.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that defaultValue will be configured once per component lifecycle. This means that if a user will change the value, defaultValue won't be configured on re-rendering. |
| id | [`ID`](https://github.com/raycast/api-docs/tree/92f866fcc364f894342bc3f920ef27057ceffb13/api-reference/user-interface.md#id) | Yes | - | ID of the form item. Make sure to assign each section a unique ID or a UUID will be auto-generated. |
| placeholder | `string` | No | - | Placeholder text shown in the text field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### FormValues

Values of items in the form.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| \[item: string\] | [`FormValue`](form.md#formvalue) | Yes | The form value of a given item. |

### DropdownValue

```typescript
DropdownValue: string | number
```

Union type for dropdown value

### FormValue

```typescript
FormValue: string | number | boolean | string[] | number[] | PickerValue | null
```

A possible form item value that will be used as an input for the submit callback of a form.

### PickerItemValue

```typescript
PickerItemValue: string | number
```

Union type for tag picker item value

### PickerValue

```typescript
PickerValue: string[] | number[] | PickerItemValue[] | undefined | null
```

Union type for tag picker value

