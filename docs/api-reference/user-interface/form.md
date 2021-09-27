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
| onSubmit | `(input: Values) => void` | Yes | - |  |

### Form.Checkbox

A form item with a checkbox.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `boolean` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
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
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.Dropdown

A form item with a dropdown menu.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.DropdownSection` or `Form.DropdownSection[]` or `Form.DropdownItem` or `Form.DropdownItem[]` | No | - | Sections or items. If [FormDropdownItem](form.md#formdropdownitem) elements are specified, a default section is automatically created. |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.DropdownItem

Represents a context-specific action that can be selected in the user interface or triggered through an assigned keyboard shortcut on the respective view.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | A optional icon displayed for the item. See [ImageLike](icons-and-images.md#imagelike) for the supported formats and types. |
| title | `string` | Yes | - | The title displayed for the item. |
| value | `string` | Yes | - | Value of the dropdown item. Make sure to assign each unique value for each item. |

### Form.DropdownSection

Visually separated group of items. Use sections to group related menu items together.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.DropdownItem` or `Form.DropdownItem[]` | No | - | The item elements of the section. When used for the action panel, the first item in the list is the _primary_ action that will be triggered by the default shortcut \(ENTER\), while the second item is the _secondary_ action triggered by CMD + ENTER. |
| title | `string` | No | - | Title displayed above the section |

### Form.Separator

A form item that shows a separator line. Use for grouping and visually separating form items.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |


### Form.TagPicker

A form item with a tag picker that allows the user to select multiple items.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| children | `null` or `Form.TagPickerItem` or `Form.TagPickerItem[]` | No | - | The list of tag picker's items. |
| defaultValue | `string[]` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | `string` | No | - | Placeholder text shown in the token field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string[]` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.TagPickerItem

A tag picker item in a [FormTagPicker](form.md#formtagpicker).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| icon | `ImageLike` | No | - | An icon to show in the token. |
| title | `string` | Yes | - | The display title of the token. |
| value | `string` | Yes | - | Value of the tag picker item. Make sure to assign unique value for each item. |

### Form.TextArea

A form item with a text area for input. The item supports multiline text entry.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
| placeholder | `string` | No | - | Placeholder text shown in the text field. |
| storeValue | `boolean` | No | - | Indicates whether the value of the item should be persisted after submitting, and restored next time the form is rendered. |
| title | `string` | No | - | The title displayed on the left side of the item. |
| value | `string` | No | - | The current value of the item. |
| onChange | `(newValue: Value) => void` | No | - |  |

### Form.TextField

A form item with a text field for input.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| defaultValue | `string` | No | - | The default value of the item. Keep in mind that `defaultValue` will be configured once per component lifecycle. This means that if a user changes the value, `defaultValue` won't be configured on re-rendering. |
| id | `string` | Yes | - | ID of the form item. Make sure to assign each form item a unique id. |
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
| \[item: string\] | `any` | Yes | The form value of a given item. |

### FormValue

```typescript
FormValue: string | number | boolean | string[] | number[] | null
```

A possible form item value that will be used as an input for the submit callback of a form.

