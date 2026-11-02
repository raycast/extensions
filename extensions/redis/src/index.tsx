import { ActionPanel, Action, List, showToast, Toast, Detail, Icon } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { clearRedisCommands, getRedisCommands, setRedisCommands } from "./lib/storage";
import { fetchRedisCommands, RedisCommand } from "./lib/redis";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [commands, setCommands] = useState<RedisCommand[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (text: string) => {
      text = text.toLowerCase();
      controllerRef.current?.abort();

      const abortCtrl = new AbortController();
      controllerRef.current = abortCtrl;

      setSearchText(text);
      setIsLoading(true);
      const fn = async () => {
        try {
          let result = await getRedisCommands();
          if (abortCtrl.signal.aborted) return;

          if (result.length === 0) {
            result = await fetchRedisCommands(abortCtrl.signal);
            if (abortCtrl.signal.aborted) return;

            await setRedisCommands(result);
            if (abortCtrl.signal.aborted) return;
          }

          result = result.filter((command) => command.name.toLowerCase().includes(text));
          for (let i = 0; i < result.length; i++) {
            if (result[i].name.toLowerCase() === text) {
              const command = result[i];
              result.splice(i, 1);
              result.splice(0, 0, command);
              break;
            }
          }
          setCommands(result);
        } catch (err) {
          if (abortCtrl.signal.aborted || (err as Error)?.name === "AbortError") return;
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch commands",
            message: String(err),
          });
        } finally {
          if (!abortCtrl.signal.aborted) setIsLoading(false);
        }
      };
      fn();
    },
    [setIsLoading, setCommands, setSearchText]
  );

  useEffect(() => {
    search("");

    return () => controllerRef.current?.abort();
  }, [search]);

  return (
    <List isLoading={isLoading} onSearchTextChange={search} searchBarPlaceholder="Search redis commands..." throttle>
      <List.Section title="Results" subtitle={commands.length + ""}>
        {commands.map((command) => (
          <List.Item
            key={command.name}
            title={command.name}
            subtitle={command.description}
            accessories={[
              {
                text: command.group.label,
              },
              {
                text: command.group.name,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push icon={Icon.Document} title="Read Document" target={<CommandREADME command={command} />} />
                <Action.OpenInBrowser title="Open in Browser" url={`https://redis.io${command.url}`} />
                <Action.SubmitForm
                  icon={Icon.ArrowClockwise}
                  title="Reload"
                  onSubmit={async () => {
                    await clearRedisCommands();
                    search(searchText);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

interface Content {
  content: string;
  encoding: string;
}

const contentURL = "https://api.github.com/repos/redis/redis-doc/contents";

const CommandREADME = ({ command }: { command: RedisCommand }) => {
  const url = `${contentURL}${command.url.slice(0, -1)}.md`;
  const { isLoading, data, revalidate } = useFetch<Content>(url);
  return (
    <Detail
      navigationTitle={`Document - ${command.name}`}
      isLoading={isLoading}
      markdown={Buffer.from(data?.content ?? "", (data?.encoding ?? "base64") as BufferEncoding).toString()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={`https://redis.io${command.url}`} />
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload"
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
};
