import { Action, ActionPanel, Detail, Icon, Keyboard, open } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useRef } from "react";
import Service, { Badge, Profile, SocialMediaEntry, Views } from "./service";

const service = new Service();

export interface ProfileViewProps {
  uuid: string;
}

interface ProfileViewState {
  profile: Profile;
  views: Views;
  socialMedia: SocialMediaEntry[];
  badges: Badge[];
}

export default function ProfileView(props: ProfileViewProps) {
  const uuid = props.uuid;
  const abortable = useRef<AbortController | null>(null);
  const loadProfile = useCallback(async (uuid: string): Promise<ProfileViewState> => {
    const signal = abortable.current?.signal;
    const [profile, views, socialMedia, badges] = await Promise.all([
      service.getProfile(uuid, signal),
      service.getViews(uuid, signal),
      service.getSocialMedia(uuid, signal),
      service.getBadges(uuid, signal),
    ]);

    try {
      await service.addSearch({ uuid, userName: profile.name });
    } catch (error) {
      await showFailureToast(error, { title: "Could not save search history" });
    }

    return { profile, views, socialMedia, badges };
  }, []);
  const {
    data: profile,
    error,
    isLoading,
    revalidate,
  } = usePromise(loadProfile, [uuid], {
    abortable,
    onError: async (error) => {
      await showFailureToast(error, { title: "Error loading profile" });
    },
  });

  if (!profile) {
    return (
      <Detail
        isLoading={isLoading}
        markdown={error ? "Couldn't load this profile." : undefined}
        actions={
          error ? (
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          ) : undefined
        }
      />
    );
  }

  const markdown = `
# ${profile.profile.name} 
UUID: \`${profile.profile.uuid}\`

### Name History
${[...profile.profile.name_history]
  .reverse()
  .map(
    (name) =>
      `- ${name.name} | ${name.accurate === false ? "~" : ""}${name.changedAt ? name.changedAt.toLocaleString() : "-"}`,
  )
  .join("\n")}

### Skins (${profile.profile.textures.skins.length})
${profile.profile.textures.skins
  .map((skin) => {
    return `[![](https://laby.net/api/v3/render/skin/${skin.imageHash}.png?shadowBlur=true&width=135&height=120)](https://laby.net/skin/${skin.imageHash})`;
  })
  .join("\n")}

### Capes (${profile.profile.textures.capes?.length ?? 0})
${
  profile.profile.textures.capes
    ?.map(
      (cape) =>
        `[![](https://laby.net/api/v3/render/cape/${cape.imageHash}.png?height=120&user=${profile.profile.uuid}&raycast-width=180&raycast-height=84)](https://laby.net/cape/${cape.imageHash})`,
    )
    .join("\n") || "No capes"
}

### Cloaks
${
  profile.profile.textures.cloaks
    ?.map(
      (cloak) =>
        `[![](https://laby.net/texture/${cloak.imageHash}.png?raycast-width=220&raycast-height=170)](https://laby.net/cloak/${cloak.imageHash})`,
    )
    .join("\n") || "No cloaks"
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Views" text={profile.views.views.toLocaleString()} icon={Icon.Eye} />
          {profile.badges.length > 0 ? (
            <>
              <Detail.Metadata.TagList title="Badges">
                {profile.badges.map((badge) => {
                  return (
                    <Detail.Metadata.TagList.Item
                      key={badge.uuid}
                      icon={`https://laby.net/api/v3/badge/${badge.uuid}/icon.png`}
                      text={badge.name}
                      onAction={() => {
                        open(`https://laby.net/badge/${badge.uuid}`);
                      }}
                    />
                  );
                })}
              </Detail.Metadata.TagList>
            </>
          ) : null}
          <Detail.Metadata.Separator />
          {profile.socialMedia.map((socialMedia) => {
            return (
              <Detail.Metadata.Link
                key={socialMedia.service}
                title={socialMedia.serviceName}
                text={socialMedia.name}
                target={socialMedia.url}
              />
            );
          })}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://laby.net/@${profile.profile.uuid}`} />
          <Action.CopyToClipboard
            title="Copy UUID"
            content={profile.profile.uuid}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser
            title="Open Mojang API"
            url={`https://sessionserver.mojang.com/session/minecraft/profile/${profile.profile.uuid}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}
