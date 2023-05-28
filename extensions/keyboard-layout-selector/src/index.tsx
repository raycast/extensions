import {
  Clipboard,
  showToast,
  Toast,
  List,
  ActionPanel,
  Action,
  Icon,
  showHUD,
  popToRoot,
  closeMainWindow,
  open
} from "@raycast/api"

import { LayoutType } from "./data"
import React, { useEffect, useState } from "react"
import { LayoutManager } from "./model/LayoutManager"

async function pasteLayout (source: LayoutType) {
  try {
    await Clipboard.copy(`${source.id}`),
      await Promise.all([showHUD(`⌨️ Pasted '${source.title}' Layout`), popToRoot(), closeMainWindow()])
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "An Error Occurred",
      message: `${e}`
    })
  }
}

export default function Command () {
  const [layouts, setLayouts] = useState<LayoutType[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        setLayouts(await LayoutManager.getAll())
      } catch (e) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't Get Layouts"
        })
      }
    })()
  }, [])

  return (
    <List isLoading={layouts.length === 0} searchBarPlaceholder='Search available layout...'>
      {layouts.map(source => (
        <List.Item
          key={source.id}
          title={source.title}
          keywords={[source.id]}
          actions={
            <ActionPanel>
              <Action icon={Icon.Checkmark} title='Past Layout id to Clipboard' onAction={() => pasteLayout(source)} />
              <Action
                icon={Icon.Gear}
                title='Keyboard Preferences'
                onAction={() => open("/System/Library/PreferencePanes/Keyboard.prefPane")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
