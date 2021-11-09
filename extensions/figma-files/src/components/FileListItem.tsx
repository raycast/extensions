import { useEffect, useState } from "react"
import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  CopyToClipboardAction,
  OpenAction,
  Application,
  getApplications,
} from "@raycast/api"
import TimeAgo from "javascript-time-ago"
import en from "javascript-time-ago/locale/en.json"

import type { File } from "../types"
import DevelopmentActionSection from "./DevelopmentActionSection"

TimeAgo.addDefaultLocale(en)
const timeAgo = new TimeAgo("en-US")

export default function FileListItem(props: { file: File; extraKey?: string; onVisit: (file: File) => void }) {
  const { file, extraKey, onVisit } = props

  const OpenProjectFileAction = (props: { file: File }) => {
    const [desktopApp, setDesktopApp] = useState<Application>()

    useEffect(() => {
      getApplications()
        .then((apps) => apps.find((a) => a.bundleId === "com.figma.Desktop"))
        .then(setDesktopApp)
    }, [])

    return desktopApp ? (
      <OpenAction
        icon="command-icon.png"
        title="Open in Figma"
        target={`figma://file/${props.file.key}`}
        application={desktopApp}
        onOpen={() => onVisit(props.file)}
      />
    ) : (
      <OpenInBrowserAction url={`https://figma.com/file/${props.file.key}`} onOpen={() => onVisit(props.file)} />
    )
  }

  const accessoryTitle = String(timeAgo.format(new Date(file.last_modified)))
  const fileIdentifier = extraKey ? `${file.key}-${extraKey}` : file.key
  return (
    <List.Item
      id={fileIdentifier}
      title={file.name}
      icon={file.thumbnail_url}
      accessoryTitle={accessoryTitle}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenProjectFileAction file={props.file} />
            <CopyToClipboardAction content={`https://figma.com/file/${file.key}`} />
          </ActionPanel.Section>
          <DevelopmentActionSection />
        </ActionPanel>
      }
    />
  )
}
