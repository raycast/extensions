import { Action, ActionPanel, Icon, List } from "@raycast/api"
import type { CodeFile } from "@sniptide/sdk"
import { type CodeAction, deliver } from "../deliver"
import { fileMarkdown, lineCount } from "../lib/format"
import { messages } from "../lib/messages"

// The files of a paste that holds several, each with its code beside it.
export function FileList(props: { title: string; files: CodeFile[]; first: CodeAction }) {
  const order: CodeAction[] = props.first === "copy" ? ["copy", "paste"] : ["paste", "copy"]
  return (
    <List isShowingDetail navigationTitle={props.title} searchBarPlaceholder={messages.chooseFile}>
      {props.files.map((file) => (
        <List.Item
          key={file.name}
          icon={Icon.Document}
          title={file.name}
          accessories={[{ text: messages.lines(lineCount(file.content)) }]}
          detail={<List.Item.Detail markdown={fileMarkdown(file)} />}
          actions={
            <ActionPanel>
              {order.map((action) => (
                <Action
                  key={action}
                  icon={action === "paste" ? Icon.Clipboard : Icon.CopyClipboard}
                  title={action === "paste" ? messages.paste : messages.copy}
                  onAction={() => deliver(file.content, action)}
                />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
