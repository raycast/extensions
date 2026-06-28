import { Action, ActionPanel, Icon, Image, List, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { listSocialSets } from "../lib/api";
import { ApiKeyRequiredView } from "../components/api-key-required";
import { DEFAULT_SOCIAL_SET_STORAGE_KEY } from "../lib/constants";
import { CreateDraftForm } from "./create-draft";
import { DraftsList } from "./drafts";
import { getPreferences } from "../lib/preferences";
import type { SocialSetListItem } from "../lib/types";
import { getErrorMessage, groupSocialSetsByTeam } from "../lib/utils";

export function SocialSetsList() {
  const [defaultSocialSetId, setDefaultSocialSetId] = useCachedState<string>(DEFAULT_SOCIAL_SET_STORAGE_KEY);
  const { data: socialSets, isLoading, error, revalidate } = usePromise(listSocialSets, []);
  const items = socialSets ?? [];
  const showEmptyState = !isLoading && !error && items.length === 0;
  const grouped = useMemo(() => groupSocialSetsByTeam(items), [items]);

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
      title="No social sets"
      description="Create a social set in Typefully to get started."
      icon={Icon.Switch}
    />
  ) : null;

  const renderSocialSetItem = (socialSet: SocialSetListItem) => {
    const isDefault = defaultSocialSetId === String(socialSet.id);
    const accessories: List.Item.Accessory[] = [];
    if (isDefault) {
      accessories.push({ text: "Default", icon: Icon.CheckCircle });
    }
    const icon = socialSet.profile_image_url
      ? { source: socialSet.profile_image_url, mask: Image.Mask.Circle }
      : Icon.Person;

    return (
      <List.Item
        key={socialSet.id}
        title={socialSet.name}
        subtitle={`@${socialSet.username}`}
        icon={icon}
        accessories={accessories}
        keywords={[socialSet.username]}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Push
                title="Create Draft Here"
                icon={Icon.Pencil}
                target={<CreateDraftForm socialSetId={String(socialSet.id)} />}
              />
              <Action.Push
                title="View Drafts Here"
                icon={Icon.List}
                target={<DraftsList socialSetId={String(socialSet.id)} />}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Set as Default"
                icon={Icon.CheckCircle}
                onAction={async () => {
                  setDefaultSocialSetId(String(socialSet.id));
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Default social set updated",
                    message: `${socialSet.name} (@${socialSet.username})`,
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
      {grouped.noTeam.length > 0 ? (
        <List.Section title="Personal" subtitle={String(grouped.noTeam.length)}>
          {grouped.noTeam.map(renderSocialSetItem)}
        </List.Section>
      ) : null}
      {grouped.teamOrder.map((teamId) => {
        const teamGroup = grouped.teamMap.get(teamId);
        if (!teamGroup) {
          return null;
        }
        return (
          <List.Section key={teamId} title={teamGroup.name} subtitle={String(teamGroup.items.length)}>
            {teamGroup.items.map(renderSocialSetItem)}
          </List.Section>
        );
      })}
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
