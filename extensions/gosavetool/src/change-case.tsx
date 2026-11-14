import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { CASES } from "./lib/text";
import { readInput, SOURCE_LABEL } from "./lib/input";
import { SITE } from "./lib/site";

export default function Command(props: LaunchProps<{ arguments: Arguments.ChangeCase }>) {
  const { data, isLoading } = usePromise(readInput, [props.arguments.text]);
  const text = data?.text ?? "";

  return (
    <List isLoading={isLoading} isShowingDetail={!!text} searchBarPlaceholder="Filter cases">
      {data?.source === "none" ? (
        <List.EmptyView
          icon={Icon.Text}
          title="Nothing to Convert"
          description="Select some text or copy it to the clipboard, then run the command again."
        />
      ) : (
        <List.Section title={data ? SOURCE_LABEL[data.source] : ""}>
          {CASES.map((c) => {
            const out = c.fn(text);
            return (
              <List.Item
                key={c.id}
                title={c.title}
                icon={Icon.Text}
                detail={<List.Item.Detail markdown={"```\n" + out + "\n```"} />}
                actions={
                  <ActionPanel>
                    <Action.Paste title="Paste to Active App" content={out} />
                    <Action.CopyToClipboard title="Copy to Clipboard" content={out} />
                    <Action.OpenInBrowser title="More Text Tools on GoSaveTool" url={SITE} />
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
