import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAliasCheck } from "@/hooks/use-alias-check";
import { readActiveUrl } from "@/lib/clipboard";

const EXPIRE_PRESETS = [
  { label: "No expiry", seconds: 0 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86400 },
  { label: "1 week", seconds: 604800 },
  { label: "1 month", seconds: 2592000 },
  { label: "3 months", seconds: 7776000 },
];

function buildExpireOptions() {
  const now = Date.now();
  const fmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return EXPIRE_PRESETS.map((p) => ({
    title:
      p.seconds === 0
        ? p.label
        : `${p.label} — ${fmt.format(now + p.seconds * 1000)}`,
    value: String(p.seconds || "none"),
  }));
}

export interface LinkFormValues {
  longUrl: string;
  alias: string;
  password: string;
  maxClicks: string;
  expireSeconds: number | null;
  blockBots: boolean;
  privateStats: boolean;
  removePassword: boolean;
  removeMaxClicks: boolean;
}

export interface LinkFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<LinkFormValues>;
  isLoading?: boolean;
  onSubmit: (values: LinkFormValues) => void;
  skipClipboardPrefill?: boolean;
  hasPassword?: boolean;
  hasMaxClicks?: boolean;
}

export function LinkForm({
  mode,
  initialValues,
  isLoading,
  onSubmit,
  skipClipboardPrefill,
  hasPassword,
  hasMaxClicks,
}: LinkFormProps) {
  const [longUrl, setLongUrl] = useState(initialValues?.longUrl ?? "");
  const [alias, setAlias] = useState(initialValues?.alias ?? "");
  const [password, setPassword] = useState(initialValues?.password ?? "");
  const isEdit = mode === "edit";
  const [maxClicks, setMaxClicks] = useState(initialValues?.maxClicks ?? "");
  const hasExistingExpiry = isEdit && initialValues?.expireSeconds != null;
  const [expireValue, setExpireValue] = useState(
    hasExistingExpiry ? "keep" : "none",
  );
  const [removePassword, setRemovePassword] = useState(false);
  const [removeMaxClicks, setRemoveMaxClicks] = useState(false);
  const [blockBots, setBlockBots] = useState(initialValues?.blockBots ?? true);
  const [privateStats, setPrivateStats] = useState(
    initialValues?.privateStats ?? mode === "create",
  );

  const originalAlias = initialValues?.alias ?? "";
  const aliasChanged = alias !== originalAlias;
  const aliasCheck = useAliasCheck(aliasChanged ? alias : "");

  useEffect(() => {
    if (skipClipboardPrefill || isEdit || initialValues?.longUrl) return;
    readActiveUrl().then((url) => {
      if (url) setLongUrl(url);
    });
  }, [skipClipboardPrefill, isEdit, initialValues?.longUrl]);

  const handleSubmit = () => {
    if (aliasCheck.error) return;
    const expireSeconds =
      expireValue === "none"
        ? null
        : expireValue === "keep"
          ? -1
          : Number(expireValue);
    onSubmit({
      longUrl,
      alias,
      password,
      maxClicks,
      expireSeconds,
      blockBots,
      privateStats,
      removePassword,
      removeMaxClicks,
    });
  };

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={
        isEdit ? `Edit · ${initialValues?.alias ?? ""}` : "Shorten Link"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Save Changes" : "Shorten"}
            icon={isEdit ? Icon.Pencil : Icon.Link}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="longUrl"
        title="URL"
        placeholder="https://example.com/a-very-long-path"
        value={longUrl}
        onChange={setLongUrl}
        autoFocus={!isEdit}
      />
      <Form.TextField
        id="alias"
        title={isEdit ? "Alias" : "Custom alias"}
        placeholder="my-link"
        info="3-16 characters. Letters, numbers, hyphens, underscores."
        value={alias}
        onChange={setAlias}
        error={aliasCheck.error}
      />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder={
          isEdit
            ? "Leave empty to keep current"
            : "Optional — 8+ chars with letter, number, special"
        }
        value={removePassword ? "" : password}
        onChange={(v) => {
          setPassword(v);
          if (v) setRemovePassword(false);
        }}
      />
      {isEdit && hasPassword && !password ? (
        <Form.Checkbox
          id="removePassword"
          label="Remove password protection"
          value={removePassword}
          onChange={setRemovePassword}
        />
      ) : null}
      <Form.TextField
        id="maxClicks"
        title="Max clicks"
        placeholder="Optional"
        value={removeMaxClicks ? "" : maxClicks}
        onChange={(v) => {
          setMaxClicks(v);
          if (v) setRemoveMaxClicks(false);
        }}
      />
      {isEdit && hasMaxClicks ? (
        <Form.Checkbox
          id="removeMaxClicks"
          label="Remove click limit"
          value={removeMaxClicks}
          onChange={(v) => {
            setRemoveMaxClicks(v);
            if (v) setMaxClicks("");
          }}
        />
      ) : null}
      <Form.Dropdown
        id="expireAfter"
        title="Expires after"
        value={expireValue}
        onChange={setExpireValue}
      >
        {isEdit && initialValues?.expireSeconds != null ? (
          <Form.Dropdown.Item title="Keep current" value="keep" />
        ) : null}
        {buildExpireOptions().map((opt) => (
          <Form.Dropdown.Item
            key={opt.value}
            title={opt.title}
            value={opt.value}
          />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Checkbox
        id="blockBots"
        label="Block bots"
        value={blockBots}
        onChange={setBlockBots}
      />
      <Form.Checkbox
        id="privateStats"
        label="Keep analytics private"
        value={privateStats}
        onChange={setPrivateStats}
      />
    </Form>
  );
}
