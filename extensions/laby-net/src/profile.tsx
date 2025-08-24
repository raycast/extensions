import { Action, ActionPanel, Detail, open } from "@raycast/api";
import { useEffect, useState } from "react";
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

  const [profile, setProfile] = useState<ProfileViewState | null>(null);

  useEffect(() => {
    (async () => {
      const results: [Profile, Views, SocialMediaEntry[], Badge[]] = await Promise.all([
        service.getProfile(uuid),
        service.getViews(uuid),
        service.getSocialMedia(uuid),
        service.getBadges(uuid),
      ]);

      const [profile, views, socialMedia, badges] = results;

      setProfile({
        profile,
        views,
        socialMedia,
        badges,
      });

      if (results[0] !== null) {
        service.addSearch({ uuid, userName: results[0].name });
      }
    })();
  }, [uuid]);

  if (profile === null) {
    return <Detail isLoading={true} />;
  }

  const markdown = `
# ${profile.profile.name} 
UUID: \`${profile.profile.uuid}\`

### Name History
${profile.profile.name_history
  .reverse()
  .map(
    (name) =>
      `- ${name.name} | ${name.accurate === false ? "~" : ""}${name.changedAt ? name.changedAt.toLocaleString() : "-"}`,
  )
  .join("\n")}

### Skins
${profile.profile.textures.skins
  .map((skin) => {
    return `[![](https://skin.laby.net/api/render/texture/${skin.imageHash}.png?shadow=true&height=120)](https://laby.net/skin/${skin.imageHash})`;
  })
  .join("\n")}

### Capes
${
  profile.profile.textures.capes
    ?.map(
      (cape) =>
        `[![](https://skin.laby.net/api/render/texture/${cape.imageHash}.png?shadow=true&height=120&user=${profile.profile.uuid})](https://laby.net/cape/${cape.imageHash})`,
    )
    .join("\n") || "No capes"
}
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Views" text={profile.views.views.toFixed()} />
          {profile.badges.length > 0 ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Badges">
                {profile.badges.map((badge) => {
                  return (
                    <Detail.Metadata.TagList.Item
                      key={badge.uuid}
                      icon={`https://laby.net/texture/badge/${badge.uuid}.png`}
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
          <Action.CopyToClipboard title="Copy UUID" content={profile.profile.uuid} />
          <Action.OpenInBrowser
            title="Open Mojang API"
            url={`https://sessionserver.mojang.com/session/minecraft/profile/${profile.profile.uuid}`}
          />
        </ActionPanel>
      }
    />
  );
}
