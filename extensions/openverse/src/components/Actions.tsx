import { ActionPanel, Icon, Action } from "@raycast/api"

import { FRONTEND_BASE } from "@/constants"
import { clipboard } from "@/functions/clipboard"
import { download } from "@/functions/download"

import { Details } from "@/components/Details"

interface ActionsProps {
  image: Image
  linkToDetails?: boolean
}

/**
 * Generate the action panel to display when an image is selected.
 *
 * @param linkToDetails - whether to include a link to the details view
 * @param image - the selected image for which the actions are generated
 * @return the `ActionPanel` UI component
 */
export function ImageActions({ linkToDetails, image }: ActionsProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {linkToDetails && (
          <Action.Push
            icon={Icon.Info}
            title="See Details"
            target={<Details image={image} />}
          />
        )}
        <Action.OpenInBrowser
          icon={Icon.MagnifyingGlass}
          title="Open In Openverse"
          url={`${FRONTEND_BASE}/image/${image.id}`}
        />
        <Action.OpenInBrowser
          title="Open Original"
          url={image.foreign_landing_url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Image">
        <Action
          icon={Icon.Clipboard}
          title="Copy Image"
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          onAction={() => clipboard(image.url, image.id)}
        />
        <Action
          icon={Icon.Download}
          title="Download Image"
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => download(image.url, image.id)}
        />
        <Action.CopyToClipboard
          title="Copy Attribution"
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          content={image.attribution}
        />
        <Action.CopyToClipboard
          title="Copy ID"
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          content={image.id}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Report">
        <Action.OpenInBrowser
          icon={Icon.Flag}
          title="Report Image"
          url={`${FRONTEND_BASE}/image/${image.id}/report`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )
}

/**
 * Generate the action panel to display when there is no image to select. It
 * only presents a link to the Openverse website.
 *
 * @return the `ActionPanel` UI component
 */
export function NoImageActions() {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          icon={Icon.MagnifyingGlass}
          title={"Go to Openverse"}
          url={FRONTEND_BASE}
        />
      </ActionPanel.Section>
    </ActionPanel>
  )
}
