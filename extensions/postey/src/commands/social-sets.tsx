import { Action, ActionPanel, Icon, Image, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { listSocialSets } from "../lib/api";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY } from "../lib/constants";
import { CreateDraftForm } from "./create-draft";
import { DraftsList } from "./drafts";
import { getPreferences } from "../lib/preferences";
import type { SocialSetListItem } from "../lib/types";
import { getErrorMessage } from "../lib/utils";

function normalizeValue(value?: string | null) {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function isLikelyIdentifier(value?: string) {
  if (!value) {
    return false;
  }
  const lower = value.replace(/^@+/, "").toLowerCase();
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lower);
  if (uuidLike) {
    return true;
  }
  const tokenParts = lower.split(/[-_]/).filter(Boolean);
  const alnumOnly = tokenParts.length > 0 && tokenParts.every((part) => /^[a-z0-9]+$/.test(part));
  const mostlyNumeric = lower.replace(/[^0-9]/g, "").length >= Math.ceil(lower.length * 0.6);
  return alnumOnly && tokenParts.length >= 4 && mostlyNumeric;
}

function getSocialSetUsername(socialSet: SocialSetListItem) {
  const candidates = [
    normalizeValue(socialSet.twitter?.username),
    normalizeValue(socialSet.linkedin?.vanity_name),
    normalizeValue(socialSet.instagram?.username),
    normalizeValue(socialSet.tiktok?.username),
    normalizeValue(socialSet.account_owner),
  ];

  const preferred = candidates.find((value) => value && !isLikelyIdentifier(value));
  if (preferred) {
    return preferred;
  }

  const fallback = candidates.find(Boolean);
  return fallback || "unknown";
}

function getSocialSetImage(socialSet: SocialSetListItem) {
  return (
    socialSet.twitter?.profile_image_url ||
    socialSet.linkedin?.profile_image_url ||
    socialSet.instagram?.profile_image_url ||
    socialSet.tiktok?.avatar_url ||
    ""
  );
}

function hasConnectedPlatformAccount(platform?: SocialSetListItem["twitter"]) {
  if (!platform || typeof platform !== "object") {
    return false;
  }
  const values = Object.values(platform as Record<string, unknown>);
  if (values.some((value) => typeof value === "string" && value.trim().length > 0)) {
    return true;
  }
  return Object.keys(platform as Record<string, unknown>).length > 0;
}

function hasConnectedPlatform(socialSet: SocialSetListItem) {
  return (
    hasConnectedPlatformAccount(socialSet.twitter) ||
    hasConnectedPlatformAccount(socialSet.linkedin) ||
    hasConnectedPlatformAccount(socialSet.instagram) ||
    hasConnectedPlatformAccount(socialSet.tiktok)
  );
}

function getSocialSetTitle(socialSet: SocialSetListItem, username: string) {
  const accountName = normalizeValue(socialSet.account_name);
  const accountOwner = normalizeValue(socialSet.account_owner);

  if (accountName && !isLikelyIdentifier(accountName)) {
    return accountName;
  }
  if (accountOwner && !isLikelyIdentifier(accountOwner)) {
    return accountOwner;
  }
  if (username !== "unknown" && !isLikelyIdentifier(username)) {
    return username;
  }
  if (username !== "unknown") {
    return `@${username}`;
  }
  return `Social Set ${socialSet.account_id}`;
}

export function SocialSetsList() {
  const [defaultSocialSetId, setDefaultSocialSetId] = useCachedState<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const { data: socialSets, isLoading, error, revalidate } = usePromise(listSocialSets, []);
  const items = (socialSets ?? []).filter(hasConnectedPlatform);
  const showEmptyState = !isLoading && !error && items.length === 0;

  const emptyView = error ? (
    <List.EmptyView
      title="Unable to load social sets"
      description={getErrorMessage(error)}
      icon={Icon.Warning}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  ) : showEmptyState ? (
    <List.EmptyView
      title="No connected social sets"
      description="Connect at least one social platform in Postey to show it here."
      icon={Icon.Switch}
    />
  ) : null;

  const renderSocialSetItem = (socialSet: SocialSetListItem) => {
    const username = getSocialSetUsername(socialSet);
    const title = getSocialSetTitle(socialSet, username);
    const subtitle =
      username !== "unknown" && username !== title && !isLikelyIdentifier(username) ? `@${username}` : undefined;
    const isDefault = defaultSocialSetId === String(socialSet.account_id);
    const accessories: List.Item.Accessory[] = [];
    if (isDefault) {
      accessories.push({ text: "Default", icon: Icon.CheckCircle });
    }
    const profileImage = getSocialSetImage(socialSet);
    const icon = profileImage ? { source: profileImage, mask: Image.Mask.Circle } : Icon.Person;

    return (
      <List.Item
        key={socialSet.account_id}
        title={title}
        subtitle={subtitle}
        icon={icon}
        accessories={accessories}
        keywords={username === "unknown" ? undefined : [username]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Create Draft Here"
                icon={Icon.Pencil}
                target={<CreateDraftForm socialSetId={String(socialSet.account_id)} />}
              />
              <Action.Push
                title="View Drafts Here"
                icon={Icon.List}
                target={<DraftsList socialSetId={String(socialSet.account_id)} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Set as Default"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  setDefaultSocialSetId(String(socialSet.account_id));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Default social set updated",
                    message: `${title} (@${username})`,
                  });
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search social sets">
      {emptyView}
      {items.map(renderSocialSetItem)}
    </List>
  );
}

export default function Command() {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    return <ApiKeyRequiredView />;
  }
  return <SocialSetsList />;
}
