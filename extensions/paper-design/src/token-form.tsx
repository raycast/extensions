import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import {
  createPaperToken,
  deletePaperToken,
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

export function TokenForm({ file, tokens, token, onChanged }: TokenFormProps) {
  const isEditing = token !== undefined;
  const { pop } = useNavigation();
  const [name, setName] = useState(token?.name ?? "");
  const [type, setType] = useState<PaperTokenType>(token?.type ?? "color");
  const [value, setValue] = useState(String(token?.value ?? ""));
  const [description, setDescription] = useState(token?.description ?? "");
  const [nameError, setNameError] = useState<string>();
  const [valueError, setValueError] = useState<string>();
  const [descriptionError, setDescriptionError] = useState<string>();

  async function submitToken() {
    const nextName = name.trim();
    const nextValue = value.trim();
    const nextDescription = description.trim();
    const tokenType = token?.type ?? type;

    if (!isValidTokenName(nextName)) {
      setNameError(
        "Start with -- and use letters, numbers, underscores, or hyphens.",
      );
      return;
    }

    if (
      tokens.some(
        (existingToken) =>
          existingToken.name === nextName && existingToken.name !== token?.name,
      )
    ) {
      setNameError("A token with this name already exists. Edit it instead.");
      return;
    }

    if (!nextValue) {
      setValueError("Enter a token value.");
      return;
    }

    const aliasName = getTokenAliasName(nextValue);
    if (
      aliasName &&
      !tokens.some((existingToken) => existingToken.name === aliasName)
    ) {
      setValueError(`No token named ${aliasName} exists in this file.`);
      return;
    }

    if (nextDescription.length > 1024) {
      setDescriptionError("Descriptions can be up to 1,024 characters.");
      return;
    }

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
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = isEditing
        ? "Could not save token"
        : "Could not create token";
      toast.message =
        "Open Paper Desktop with a Paper file loaded and try again.";
    }
  }

  async function deleteToken() {
    if (!token) {
      return;
    }

    const confirmed = await confirmAlert({
      icon: Icon.Trash,
      title: "Delete token?",
      message: `Delete ${token.name} from ${file.name}? References to it may no longer resolve.`,
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
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Deleting “${token.name}”`,
    });

    try {
      await deletePaperToken(file.id, token.name);
      await onChanged();
      toast.style = Toast.Style.Success;
      toast.title = `Deleted “${token.name}”`;
      pop();
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete token";
      toast.message =
        "Open Paper Desktop with a Paper file loaded and try again.";
    }
  }

  return (
    <Form
      navigationTitle={isEditing ? "Edit Token" : "Create Token"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Create Token"}
            icon={isEditing ? Icon.Pencil : Icon.Plus}
            onSubmit={submitToken}
          />
          {token ? (
            <ActionPanel.Section>
              <Action
                title="Delete Token"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={deleteToken}
              />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="--color-brand-primary"
        info="Use a CSS custom property name starting with --."
        autoFocus
        value={name}
        error={nameError}
        onChange={(nextName) => {
          setName(nextName);
          if (nextName) {
            setNameError(undefined);
          }
        }}
      />
      {token ? (
        <Form.Description title="Type" text={tokenTypeLabels[token.type]} />
      ) : (
        <Form.Dropdown
          id="type"
          title="Type"
          value={type}
          onChange={(nextType) => setType(nextType as PaperTokenType)}
        >
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
        id="value"
        title="Value"
        placeholder={tokenValuePlaceholders[token?.type ?? type]}
        info="Use var(--another-token) to alias an existing token."
        value={value}
        error={valueError}
        onChange={(nextValue) => {
          setValue(nextValue);
          if (nextValue) {
            setValueError(undefined);
          }
        }}
      />
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional guidance for using this token"
        value={description}
        error={descriptionError}
        onChange={(nextDescription) => {
          setDescription(nextDescription);
          if (nextDescription.length <= 1024) {
            setDescriptionError(undefined);
          }
        }}
      />
      <Form.Description title="Paper File" text={file.name} />
    </Form>
  );
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
