import { Action, ActionPanel, Clipboard, Keyboard, List, showToast } from "@raycast/api"
import { SubRecord } from "./api"
import SubDetail from "./SubDetail"
import { getInstrumentation } from "./api"


function SubListItem(sub: SubRecord) {

  const generateKeyWords = () => {
    const words = []
    switch(true){
      case !sub.horizon:
        words.push("nuke");
        break;
      case sub.horizon:
        words.push("horizon")
        break;
      case sub.rProxy:
        words.push("rProxy");
        break;
      case sub.wren && sub.bigTable:
        words.push("bqio");
        break;
      case sub.smartSampling:
        words.push("sampling");
        break;
      default:
        null;
    }
    return words
  }
  const showInstrumentation = async () => {
    const inst = await getInstrumentation(sub.instance)
    return showToast({title: "Instrumentation", message: inst, primaryAction: {title: "Copy", onAction: () => Clipboard.copy(inst), shortcut: Keyboard.Shortcut.Common.Copy}})
  }
  return (
    <List.Item
          key={sub.instance}
          icon="list-icon.png"
          title={sub.instance}
          accessories={[
            { text: sub.smartSampling ? "sampling" : null },
            { text: sub.horizon ? null : "nuke" },
            { text: sub.rProxy ? "rProxy" : null },
            { text: sub.wren && sub.bigTable ? "bqio" : null },
          ]}
          keywords={generateKeyWords()}
          actions={
            <ActionPanel title="Sub Actions">
              <Action.Push title="Sub Details" target={<SubDetail {...sub}/>}/>
              <Action title="Get Instrumentation" onAction={showInstrumentation} />
              <Action.OpenInBrowser
                url={("https://" + sub.vHost + "/#/search") as string} shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
  )
}

export default SubListItem