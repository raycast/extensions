import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { limits } from "./lib/text";
import { fmt, readInput, SOURCE_LABEL } from "./lib/input";
import { toolUrl } from "./lib/site";

export default function Command(props: LaunchProps<{ arguments: Arguments.CheckSocialLimits }>) {
  const { data, isLoading } = usePromise(readInput, [props.arguments.text]);
  const text = data?.text ?? "";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter platforms">
      {data?.source === "none" ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Nothing to Check"
          description="Select some text or copy it to the clipboard, then run the command again."
        />
      ) : (
        <List.Section
          title={`${fmt([...text].length)} characters`}
          subtitle={data ? SOURCE_LABEL[data.source] : undefined}
        >
          {limits(text).map((l) => (
            <List.Item
              key={l.key}
              title={l.label}
              icon={
                l.left >= 0
                  ? { source: Icon.CheckCircle, tintColor: Color.Green }
                  : { source: Icon.XMarkCircle, tintColor: Color.Red }
              }
              subtitle={`${fmt(l.used)} / ${fmt(l.limit)}`}
              accessories={[
                {
                  tag:
                    l.left >= 0
                      ? { value: `${fmt(l.left)} left`, color: Color.Green }
                      : { value: `${fmt(-l.left)} over`, color: Color.Red },
                  tooltip:
                    l.key === "x-post" ? "X counts emoji and CJK characters as 2 and every link as 23" : undefined,
                },
              ]}
              actions={
                <ActionPanel>
                  {l.left < 0 ? <Action.CopyToClipboard title="Copy Part That Fits" content={l.fit} /> : null}
                  <Action.OpenInBrowser title="Open Character Counter" url={toolUrl("character-counter")} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
