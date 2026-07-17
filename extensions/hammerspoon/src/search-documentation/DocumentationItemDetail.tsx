import { Action, ActionPanel, closeMainWindow, Detail } from '@raycast/api'
import { runAppleScript } from '@raycast/utils'
import { GotoSubmenu } from './GotoSubmenu'
import { DocumentationDetailItem } from '../documentation/types'

type DocumentationItemDetailProps = {
  item: DocumentationDetailItem
}

export default function DocumentationItemDetail({ item }: DocumentationItemDetailProps) {
  const nameParts = item.name.split('.')
  let moduleName

  if (item.parentId == null || nameParts.length === 1) {
    moduleName = item.name
  } else {
    moduleName = nameParts.slice(0, -1).join('.')
  }

  let hash

  if (item.parentId == null || nameParts.length === 1) {
    hash = ''
  } else {
    hash = nameParts[nameParts.length - 1]
  }

  let itemUrl = `https://www.hammerspoon.org/docs/${moduleName}.html`

  if (hash) {
    itemUrl += `#${hash}`
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          {item.sourceType === 'hs' && <Action.OpenInBrowser title="Open in Browser" url={itemUrl} />}
          {item.sourceType === 'hs' && (
            <Action
              icon={{ source: 'icon-prod.png' }}
              title="Open in Hammerspoon"
              onAction={async () => {
                await runAppleScript(`
                  tell application "Hammerspoon"
                    execute lua code "
                      local hsApp = hs.application.get(hs.processInfo.bundleID)

                      if hsApp then
                        hsApp:activate()
                        hs.doc.hsdocs.help('${item.name}')
                        local hsDocsWindow = hsApp:findWindow('Hammerspoon docs')

                        if hsDocsWindow then
                          hsDocsWindow:focus()
                        end
                      end
                    "
                  end tell
                `)

                await closeMainWindow()
              }}
            />
          )}
          <Action.CopyToClipboard title="Copy Path" content={item.name} />
          <Action.Paste title="Paste Path" content={item.name} shortcut={{ modifiers: ['opt', 'cmd'], key: 'v' }} />
          {<GotoSubmenu item={item} />}
        </ActionPanel>
      }
      markdown={getMarkdownForDocumentationItem(item)}
    />
  )
}

function getMarkdownForDocumentationItem(item: DocumentationDetailItem): string {
  return `# ${item.name}\n${item.documentation}\n`
}
