import { Action, ActionPanel, List } from "@raycast/api";
import { Extension, useExtensions, User } from "../lib/extensions";
import { compactNumberFormat } from "../lib/utils";

export interface UserExtensions {
  author: User;
  download_count: number;
}

function combineUserData(extenions: Extension[] | undefined): UserExtensions[] | undefined {
  if (!extenions) {
    return undefined;
  }
  const result: Record<string, UserExtensions> = {};
  for (const e of extenions) {
    const a = e.author;
    const h = e.author.handle;
    if (h in result) {
      result[h].download_count += e.download_count;
    } else {
      result[h] = {
        author: a,
        download_count: e.download_count,
      };
    }
  }
  const ar: UserExtensions[] = Object.keys(result).map((k) => {
    return result[k];
  });
  return ar;
}

function sort(extensions: Extension[] | undefined): Extension[] | undefined {
  if (!extensions) {
    return undefined;
  }
  const exts = extensions.sort((a, b) => b.download_count - a.download_count).slice(0, 20);
  return exts;
}

export function AuthorChartsPerDownload(): JSX.Element {
  const { extensions, isLoading } = useExtensions();
  const usersRaw = combineUserData(extensions);

  const users = usersRaw?.sort((a, b) => b.download_count - a.download_count);
  return (
    <List isLoading={isLoading}>
      <List.Section title={`Authors ${users?.length || 0}`}>
        {users?.map((u) => (
          <List.Item
            key={u.author.handle}
            title={u.author.name}
            subtitle={u.author.handle}
            accessories={[{ text: `${compactNumberFormat(u.download_count)}` }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://www.raycast.com/${u.author.handle}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
