import { Action, Icon, Keyboard, showToast, Toast, useNavigation } from "@raycast/api"
import type { CodeFile, Paste, PasteSummary } from "@sniptide/sdk"
import { client } from "../api"
import { type CodeAction, deliver } from "../deliver"
import { messages } from "../lib/messages"
import { report } from "../report"
import { FileList } from "./file-list"

// Paste Code and Copy Code for a paste whose files aren't loaded yet. A list holds summaries, so
// the code is fetched when the reader asks for it, and a paste with several files asks which one.
export function CodeActions({ paste, first }: { paste: PasteSummary | Paste; first: CodeAction }) {
  const { push } = useNavigation()

  async function run(action: CodeAction) {
    const toast = await showToast({ style: Toast.Style.Animated, title: messages.loadingPaste })
    try {
      const files: CodeFile[] =
        "files" in paste ? paste.files : (await client().readPaste(paste.id)).paste.files
      const [file] = files
      if (!file) {
        toast.style = Toast.Style.Failure
        toast.title = messages.emptyPaste
        return
      }
      await toast.hide()
      if (files.length > 1) push(<FileList title={paste.title} files={files} first={action} />)
      else await deliver(file.content, action)
    } catch (error) {
      await report(error, messages.failed)
    }
  }

  const order: CodeAction[] = first === "copy" ? ["copy", "paste"] : ["paste", "copy"]
  return (
    <>
      {order.map((action) => (
        <Action
          key={action}
          icon={action === "paste" ? Icon.Clipboard : Icon.CopyClipboard}
          title={action === "paste" ? messages.paste : messages.copy}
          onAction={() => run(action)}
        />
      ))}
    </>
  )
}

export function LinkActions({ paste }: { paste: Pick<PasteSummary, "url"> }) {
  return (
    <>
      <Action.CopyToClipboard
        title={messages.copyLink}
        content={paste.url}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.OpenInBrowser
        title={messages.open}
        url={paste.url}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
    </>
  )
}
