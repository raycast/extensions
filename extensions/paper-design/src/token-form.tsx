import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import {
  createPaperToken,
  deletePaperToken,
  getPaperErrorMessage,
  paperTokenTypes,
  type PaperFile,
  type PaperToken,
  type PaperTokenType,
  updatePaperToken,
} from "./paper-mcp";

type TokenFormProps = {
  file: Pick<PaperFile, "id" | "name">;
  tokens: PaperToken[];
  token?: PaperToken;
  onChanged: () => Promise<void>;
};

type TokenFormValues = {
  name: string;
  type: string;
  value: string;
  description: string;
};

const tokenTypeLabels: Record<PaperTokenType, string> = {
  breakpoint: "Breakpoint",
  color: "Color",
  container: "Container",
  fontFamily: "Font Family",
  fontSize: "Font Size",
  fontWeight: "Font Weight",
  letterSpacing: "Letter Spacing",
  lineHeight: "Line Height",
  radius: "Radius",
  spacing: "Spacing",
};

const tokenValuePlaceholders: Record<PaperTokenType, string> = {
  breakpoint: "768px",
  color: "#635BFF",
  container: "1200px",
  fontFamily: "Inter, sans-serif",
  fontSize: "16px",
  fontWeight: "400",
  letterSpacing: "0.01em",
  lineHeight: "24px",
  radius: "8px",
  spacing: "16px",
};

export async function deletePaperTokenWithConfirm(
  file: Pick<PaperFile, "id" | "name">,
  tokenName: string,
): Promise<boolean> {
  const confirmed = await confirmAlert({
    icon: Icon.Trash,
    title: "Delete Token?",
    message: `Delete ${tokenName} from ${file.name}? References to it may no longer resolve.`,
    primaryAction: {
      title: "Delete Token",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
      style: Alert.ActionStyle.Cancel,
    },
  });

  if (!confirmed) {
    return false;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Deleting “${tokenName}”`,
  });

  try {
    await deletePaperToken(file.id, tokenName);
    toast.style = Toast.Style.Success;
    toast.title = `Deleted “${tokenName}”`;
    return true;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not delete token";
    toast.message = getPaperErrorMessage(error);
    return false;
  }
}

export function TokenForm({ file, tokens, token, onChanged }: TokenFormProps) {
  const isEditing = token !== undefined;
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, values } = useForm<TokenFormValues>({
    initialValues: {
      name: token?.name ?? "",
      type: token?.type ?? "color",
      value: String(token?.value ?? ""),
      description: token?.description ?? "",
    },
    validation: {
      name: (value) => {
        const nextName = value?.trim() ?? "";

        if (!isValidTokenName(nextName)) {
          return "Start with -- and use letters, numbers, underscores, or hyphens.";
        }

        if (
          tokens.some(
            (existingToken) =>
              existingToken.name === nextName &&
              existingToken.name !== token?.name,
          )
        ) {
          return "A token with this name already exists. Edit it instead.";
        }
      },
      value: (value) => {
        const nextValue = value?.trim() ?? "";

        if (!nextValue) {
          return "Enter a token value.";
        }

        const aliasName = getTokenAliasName(nextValue);
        if (
          aliasName &&
          !tokens.some((existingToken) => existingToken.name === aliasName)
        ) {
          return `No token named ${aliasName} exists in this file.`;
        }
      },
      description: (value) => {
        if ((value ?? "").trim().length > 1024) {
          return "Descriptions can be up to 1,024 characters.";
        }
      },
    },
    async onSubmit(formValues) {
      const nextName = formValues.name.trim();
      const nextValue = formValues.value.trim();
      const nextDescription = formValues.description.trim();
      const tokenType = token?.type ?? toPaperTokenType(formValues.type);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isEditing ? "Saving token" : "Creating token",
      });

      try {
        if (token) {
          const valueChanged = String(token.value) !== nextValue;
          const descriptionChanged =
            (token.description ?? "") !== nextDescription;
          const nameChanged = token.name !== nextName;

          if (valueChanged || descriptionChanged || nameChanged) {
            await updatePaperToken(file.id, {
              name: token.name,
              ...(nameChanged ? { newName: nextName } : {}),
              ...(valueChanged
                ? { value: normalizeTokenValue(nextValue, token.type) }
                : {}),
              ...(descriptionChanged ? { description: nextDescription } : {}),
            });
            await onChanged();
          }

          toast.style = Toast.Style.Success;
          toast.title = `Updated “${nextName}”`;
        } else {
          await createPaperToken(file.id, {
            name: nextName,
            type: tokenType,
            value: normalizeTokenValue(nextValue, tokenType),
            ...(nextDescription ? { description: nextDescription } : {}),
          });
          await onChanged();

          toast.style = Toast.Style.Success;
          toast.title = `Created “${nextName}”`;
        }

        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = isEditing
          ? "Could not save token"
          : "Could not create token";
        toast.message = getPaperErrorMessage(error);
      }
    },
  });

  async function deleteToken() {
    if (!token) {
      return;
    }

    if (await deletePaperTokenWithConfirm(file, token.name)) {
      await onChanged();
      pop();
    }
  }

  const selectedType = token?.type ?? toPaperTokenType(values.type);

  return (
    <Form
      navigationTitle={isEditing ? "Edit Token" : "Create Token"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Create Token"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={handleSubmit}
          />
          {token ? (
            <ActionPanel.Section>
              <Action
                title="Delete Token"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={deleteToken}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="--color-brand-primary"
        info="Use a CSS custom property name starting with --."
        autoFocus
        {...itemProps.name}
      />
      {token ? (
        <Form.Description title="Type" text={tokenTypeLabels[token.type]} />
      ) : (
        <Form.Dropdown title="Type" {...itemProps.type}>
          {paperTokenTypes.map((tokenType) => (
            <Form.Dropdown.Item
              key={tokenType}
              value={tokenType}
              title={tokenTypeLabels[tokenType]}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField
        title="Value"
        placeholder={tokenValuePlaceholders[selectedType]}
        info="Use var(--another-token) to alias an existing token."
        {...itemProps.value}
      />
      <Form.TextArea
        title="Description"
        placeholder="Optional guidance for using this token"
        {...itemProps.description}
      />
      <Form.Description title="Paper File" text={file.name} />
    </Form>
  );
}

function toPaperTokenType(value: string): PaperTokenType {
  switch (value) {
    case "breakpoint":
    case "color":
    case "container":
    case "fontFamily":
    case "fontSize":
    case "fontWeight":
    case "letterSpacing":
    case "lineHeight":
    case "radius":
    case "spacing":
      return value;
    default:
      return "color";
  }
}

function isValidTokenName(value: string): boolean {
  return /^--[A-Za-z_][A-Za-z0-9_-]*$/.test(value);
}

function getTokenAliasName(value: string): string | undefined {
  const match = /^var\(\s*(--[A-Za-z_][A-Za-z0-9_-]*)\s*\)$/.exec(value);
  return match?.[1];
}

function normalizeTokenValue(
  value: string,
  type: PaperTokenType,
): string | number {
  if (type === "fontWeight" && /^\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}
