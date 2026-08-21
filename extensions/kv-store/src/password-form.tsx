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
import { generatePassword } from "./password";

const NO_CATEGORY_VALUE = "__none__";

export type PasswordEntryValues = {
  key: string;
  value: string;
  categoryId?: string;
};

type PasswordFormValues = {
  key: string;
  categoryId: string;
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
    },
    async onSubmit(values) {
      const key = values.key.trim();
      const categoryId = values.categoryId === NO_CATEGORY_VALUE ? undefined : values.categoryId;

      try {
        const password = generatePassword();
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
      <Form.Description text="Generates a 12-character password using only letters and digits, saves it, and copies it to the clipboard." />
    </Form>
  );
}
