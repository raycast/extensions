import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { LIMITS } from "./lib/text";
import { fmt, readInput, SOURCE_LABEL } from "./lib/input";
import { toolUrl } from "./lib/site";

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckSocialLimits }>) {
  const { data, isLoading } = usePromise(readInput, [props.arguments.text]);
  const chars = [...(data?.text ?? "")];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter platforms">
      {data?.source === "none" ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Nothing to Check"
          description="Select some text or copy it to the clipboard, then run the command again."
        />
      ) : (
        <List.Section title={`${fmt(chars.length)} characters`} subtitle={data ? SOURCE_LABEL[data.source] : undefined}>
          {LIMITS.map((l) => {
            const left = l.limit - chars.length;
            return (
              <List.Item
                key={l.key}
                title={l.label}
                icon={
                  left >= 0
                    ? { source: Icon.CheckCircle, tintColor: Color.Green }
                    : { source: Icon.XMarkCircle, tintColor: Color.Red }
                }
                subtitle={`${fmt(chars.length)} / ${fmt(l.limit)}`}
                accessories={[
                  {
                    tag:
                      left >= 0
                        ? { value: `${fmt(left)} left`, color: Color.Green }
                        : { value: `${fmt(-left)} over`, color: Color.Red },
                  },
                ]}
                actions={
                  <ActionPanel>
                    {left < 0 ? (
                      <Action.CopyToClipboard
                        title={`Copy First ${fmt(l.limit)} Characters`}
                        content={chars.slice(0, l.limit).join("")}
                      />
                    ) : null}
                    <Action.OpenInBrowser title="Open Character Counter" url={toolUrl("character-counter")} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
