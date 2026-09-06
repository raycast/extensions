import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useMemo, useState } from "react";
import { PERMISSIONS } from "./data/permissions";
import { getPreferences } from "./lib/preferences";

const PLACEHOLDER_ID = "YOUR_CLIENT_ID";

function permissionValue(selected: string[]): bigint {
  return PERMISSIONS.filter((permission) =>
    selected.includes(permission.name),
  ).reduce((total, permission) => total | (1n << BigInt(permission.bit)), 0n);
}

function scopeOf(permission: (typeof PERMISSIONS)[number]): string {
  if (permission.guild && permission.channel) return "guild · channel";
  return permission.channel ? "channel" : "guild";
}

function enumSetSnippet(selected: string[]): string {
  if (!selected.length) return "EnumSet.noneOf(Permission.class)";
  return `EnumSet.of(${selected.map((name) => `Permission.${name}`).join(", ")})`;
}

function checkSnippet(selected: string[]): string {
  if (!selected.length) return "member.hasPermission()";
  return `member.hasPermission(${selected.map((name) => `Permission.${name}`).join(", ")})`;
}

function inviteUrl(value: bigint, applicationId: string): string {
  const id = applicationId || PLACEHOLDER_ID;
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=${value}&scope=bot%20applications.commands`;
}

export default function PermissionsCalculator() {
  const { applicationId } = getPreferences();
  const [query, setQuery] = useState("");
  const { value: selected, setValue: setSelected } = useLocalStorage<string[]>(
    "permissions",
    [],
  );

  const chosen = useMemo(() => selected ?? [], [selected]);
  const value = useMemo(() => permissionValue(chosen), [chosen]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return PERMISSIONS;
    const underscored = needle.replace(/\s+/g, "_");
    return PERMISSIONS.filter(
      (permission) =>
        permission.name.toLowerCase().includes(underscored) ||
        permission.display.toLowerCase().includes(needle),
    );
  }, [query]);

  function toggle(name: string) {
    setSelected(
      chosen.includes(name)
        ? chosen.filter((item) => item !== name)
        : [...chosen, name],
    );
  }

  async function clear() {
    await setSelected([]);
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared all permissions",
    });
  }

  const resultActions = (
    <ActionPanel>
      <Action.CopyToClipboard
        title="Copy Permission Value"
        content={value.toString()}
        icon={Icon.Hashtag}
      />
      <Action.CopyToClipboard
        title="Copy Java Enumset"
        content={enumSetSnippet(chosen)}
        icon={Icon.Code}
      />
      <Action.CopyToClipboard
        title="Copy Permission Check"
        content={checkSnippet(chosen)}
        icon={Icon.CodeBlock}
      />
      <Action.CopyToClipboard
        title="Copy Invite URL"
        content={inviteUrl(value, applicationId)}
        icon={Icon.Link}
      />
      {applicationId ? (
        <Action.OpenInBrowser
          title="Open Invite URL"
          url={inviteUrl(value, applicationId)}
        />
      ) : (
        <Action
          title="Open Extension Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      )}
      <Action title="Clear Selection" icon={Icon.Trash} onAction={clear} />
    </ActionPanel>
  );

  return (
    <List
      searchBarPlaceholder="Filter permissions — manage roles, send messages…"
      onSearchTextChange={setQuery}
      filtering={false}
    >
      <List.Section title="Result">
        <List.Item
          icon={{ source: Icon.Calculator, tintColor: Color.Blue }}
          title={value.toString()}
          subtitle={
            chosen.length
              ? `${chosen.length} selected`
              : "No permissions selected"
          }
          accessories={[
            {
              text: applicationId
                ? "invite ready"
                : `client id: ${PLACEHOLDER_ID}`,
            },
          ]}
          actions={resultActions}
        />
      </List.Section>

      <List.Section
        title="Permissions"
        subtitle={`${visible.length} of ${PERMISSIONS.length}`}
      >
        {visible.map((permission) => {
          const isSelected = chosen.includes(permission.name);
          return (
            <List.Item
              key={permission.name}
              icon={
                isSelected
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.SecondaryText }
              }
              title={`Permission.${permission.name}`}
              subtitle={permission.display}
              accessories={[
                { text: scopeOf(permission) },
                { text: `1 << ${permission.bit}` },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.MinusCircle : Icon.PlusCircle}
                    onAction={() => toggle(permission.name)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Permission Name"
                    content={`Permission.${permission.name}`}
                    shortcut={Keyboard.Shortcut.Common.CopyName}
                  />
                  {resultActions.props.children}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
