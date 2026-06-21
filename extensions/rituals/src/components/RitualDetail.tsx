import { Color, Icon, Image, List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { Profile } from "../lib/profiles";

const { Metadata } = List.Item.Detail;

function host(u: string): string {
  try {
    return new URL(u.includes("://") ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
}

const base = (p: string) => p.split("/").filter(Boolean).pop() || p;

/** Rich detail pane for a ritual: apps, websites, files, commands and settings. */
export default function RitualDetail({
  profile,
  appIcon,
}: {
  profile: Profile;
  appIcon: (name: string) => Image.ImageLike;
}) {
  const apps = profile.apps.filter((a) => a.trim());
  const urls = profile.urls.filter((u) => u.trim());
  const paths = (profile.paths ?? []).filter((p) => p.trim());
  const commands = profile.commands;

  const summary = [
    apps.length && `${apps.length} app${apps.length === 1 ? "" : "s"}`,
    urls.length && `${urls.length} site${urls.length === 1 ? "" : "s"}`,
    paths.length && `${paths.length} file${paths.length === 1 ? "" : "s"}`,
    commands.length && `${commands.length} command${commands.length === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <List.Item.Detail
      metadata={
        <Metadata>
          <Metadata.Label title="Ritual" text={summary || "Empty"} icon={profile.icon || Icon.Layers} />
          <Metadata.Separator />
          {apps.length > 0 && (
            <Metadata.TagList title="Apps">
              {apps.map((a) => (
                <Metadata.TagList.Item key={a} text={a} icon={appIcon(a)} />
              ))}
            </Metadata.TagList>
          )}
          {urls.length > 0 && (
            <Metadata.TagList title="Websites">
              {urls.map((u) => (
                <Metadata.TagList.Item key={u} text={host(u)} icon={getFavicon(u, { fallback: Icon.Globe })} />
              ))}
            </Metadata.TagList>
          )}
          {paths.length > 0 && (
            <Metadata.TagList title="Files">
              {paths.map((p) => (
                <Metadata.TagList.Item key={p} text={base(p)} icon={{ fileIcon: p }} />
              ))}
            </Metadata.TagList>
          )}

          {commands.length > 0 && <Metadata.Separator />}
          {commands.map((c, i) => (
            <Metadata.Label
              key={i}
              title={i === 0 ? "Commands" : ""}
              text={c.run || c.stop || ""}
              icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
            />
          ))}

          <Metadata.Separator />
          <Metadata.Label
            title="Browser"
            text={
              profile.browser
                ? `${profile.browser}${profile.browserProfile ? ` · ${profile.browserProfile}` : ""}`
                : "Default"
            }
            icon={Icon.Globe}
          />
          {profile.fastMode && <Metadata.Label title="Fast mode" text="On" icon={Icon.Bolt} />}
          {profile.stepDelay ? (
            <Metadata.Label title="Delay" text={`${profile.stepDelay}s between commands`} icon={Icon.Clock} />
          ) : null}
        </Metadata>
      }
    />
  );
}
