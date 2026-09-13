import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import { Category, Entry } from "./entries";
import { DEFAULT_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, generatePassword } from "./password";

const NO_CATEGORY_VALUE = "__none__";

export type PasswordEntryValues = {
  key: string;
  value: string;
  categoryId?: string;
};

type PasswordFormValues = {
  key: string;
  categoryId: string;
  length: string;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludedCharacters: string;
};

type PasswordFormProps = {
  entries: Entry[];
  categories: Category[];
  initialKey?: string;
  initialCategoryId?: string;
  closeAfterSave?: boolean;
  onSave: (values: PasswordEntryValues) => Promise<unknown>;
};

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => left.name.localeCompare(right.name));
}

export function PasswordForm({
  entries,
  categories,
  initialKey = "",
  initialCategoryId,
  closeAfterSave = false,
  onSave,
}: PasswordFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<PasswordFormValues>({
    initialValues: {
      key: initialKey,
      categoryId: initialCategoryId ?? NO_CATEGORY_VALUE,
      length: String(DEFAULT_PASSWORD_LENGTH),
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: false,
      excludedCharacters: "",
    },
    validation: {
      key: (value) => {
        const normalized = normalizeName(value ?? "");

        if (!normalized) {
          return "Enter a key";
        }

        const duplicate = entries.some((entry) => normalizeName(entry.key) === normalized);

        return duplicate ? "This key already exists" : undefined;
      },
      length: (value) => {
        const normalized = value?.trim() ?? "";

        if (!/^\d+$/.test(normalized)) {
          return "Enter a whole number";
        }

        const length = Number(normalized);
        return length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH
          ? `Use a length from ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH}`
          : undefined;
      },
    },
    async onSubmit(values) {
      const key = values.key.trim();
      const categoryId = values.categoryId === NO_CATEGORY_VALUE ? undefined : values.categoryId;

      try {
        const password = generatePassword({
          length: Number(values.length),
          includeLowercase: values.includeLowercase,
          includeUppercase: values.includeUppercase,
          includeNumbers: values.includeNumbers,
          includeSymbols: values.includeSymbols,
          excludedCharacters: values.excludedCharacters,
        });
        await onSave({ key, value: password, categoryId });
        await Clipboard.copy(password);
        if (closeAfterSave) {
          await closeMainWindow();
        } else {
          pop();
        }
        await showHUD(`Generated and Copied: ${key}`);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Generate Password",
          message: error instanceof Error ? error.message : String(error),
        });
        return false;
      }

      return true;
    },
  });

  return (
    <Form
      navigationTitle="Generate Password"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate and Copy" icon={Icon.Key} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Key"
        placeholder="For example, DATABASE_PASSWORD"
        autoFocus={!initialKey}
        {...itemProps.key}
      />
      <Form.Dropdown title="Category" {...itemProps.categoryId}>
        <Form.Dropdown.Item value={NO_CATEGORY_VALUE} title="Uncategorized" />
        {sortCategories(categories).map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField title="Length" placeholder={String(DEFAULT_PASSWORD_LENGTH)} {...itemProps.length} />
      <Form.Checkbox title="Characters" label="Lowercase Letters (a-z)" {...itemProps.includeLowercase} />
      <Form.Checkbox label="Uppercase Letters (A-Z)" {...itemProps.includeUppercase} />
      <Form.Checkbox label="Numbers (0-9)" {...itemProps.includeNumbers} />
      <Form.Checkbox label="Symbols (!@#$...)" {...itemProps.includeSymbols} />
      <Form.TextField
        title="Exclude Characters"
        placeholder="For example, 0OIl1"
        info="Every character entered here is removed from the generator."
        {...itemProps.excludedCharacters}
      />
      <Form.Description text="The password includes at least one character from every selected set, is saved as the key's value, and is copied to the clipboard." />
    </Form>
  );
}
