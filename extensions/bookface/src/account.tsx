import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { runYc } from "./lib/yc";
import {
  ErrorDetail,
  MissingCliDetail,
  NotAuthedDetail,
} from "./lib/empty-states";
import type { Me } from "./lib/types";
import { UpdateYcCli } from "./views/updater";

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(
    () => runYc<Me>(["me", "--json"]),
    [],
    { keepPreviousData: true },
  );

  if (!data) return <Detail isLoading={isLoading} markdown="" />;

  if (!data.ok) {
    if (data.kind === "missing-cli")
      return <MissingCliDetail onRetry={revalidate} />;
    if (data.kind === "not-authed")
      return <NotAuthedDetail onRetry={revalidate} />;
    if (data.kind === "update-required")
      return <UpdateYcCli gate={data.gate} onRetry={revalidate} />;
    return <ErrorDetail message={data.message} onRetry={revalidate} />;
  }

  const me = data.data;
  const profileUrl = `https://bookface.ycombinator.com/user/${me.id}`;
  const fullName = `${me.first_name} ${me.last_name}`.trim();
  const companies = me.yc_companies ?? [];

  const markdown = `# ${fullName}\n\nLogged in to Bookface as **@${me.hnid}**.`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={fullName} />
          <Detail.Metadata.Label title="Username" text={`@${me.hnid}`} />
          {me.email ? (
            <Detail.Metadata.Label title="Email" text={me.email} />
          ) : null}
          <Detail.Metadata.Label title="User ID" text={String(me.id)} />
          {companies.length > 0 ? (
            <Detail.Metadata.TagList title="YC Companies">
              {companies.map((c) => (
                <Detail.Metadata.TagList.Item
                  key={c.id}
                  text={`${c.name} (${c.batch})`}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Profile"
            target={profileUrl}
            text="View on Bookface"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open Profile in Browser"
            url={profileUrl}
          />
          <Action.CopyToClipboard title="Copy Username" content={me.hnid} />
          <Action.CopyToClipboard
            title="Copy Profile URL"
            content={profileUrl}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
          <Action.Push
            title="Update YC CLI"
            icon={Icon.Download}
            target={<UpdateYcCli />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
          />
        </ActionPanel>
      }
    />
  );
}
