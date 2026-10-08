import { ActionPanel, List, Action, Icon, Color, getPreferenceValues, closeMainWindow } from '@raycast/api'
import { runAppleScript, showFailureToast, useCachedPromise } from '@raycast/utils'

interface ScriptItem {
  id: string
  name: string
  description?: string
  keywords?: string[]
}

export default function main() {
  const {
    isLoading,
    data: scriptItems,
    revalidate: revalidateScripts,
    error
  } = useCachedPromise(
    async (): Promise<ScriptItem[]> => {
      const preferences = getPreferenceValues()
      const output = await runAppleScript(
        `
        ;(() => {
          const app = Application('Hammerspoon')
          const output = app.executeLuaCode(\`
            if ${preferences.scriptsVariableName} and type(${preferences.scriptsVariableName}.list) == 'function' then
              return ${preferences.scriptsVariableName}.list()
            end

            return hs.json.encode({ error = "Could not find scripts variable '${
              preferences.scriptsVariableName
            }' or it does not have a .list function. Make sure it exists in your Hammerspoon configuration file or that it is a valid object with functions" })
          \`)
          return output
        })()
      `,
        { language: 'JavaScript' }
      )

      const parsed = JSON.parse(output)

      if (parsed.error) {
        throw new Error(parsed.error)
      }

      const baseErrMsg = `"${preferences.scriptsVariableName}.list()" returned invalid output.`

      if (!Array.isArray(parsed)) {
        throw new Error(`${baseErrMsg} It should return an array of script objects.`)
      }

      for (const script of parsed) {
        if (typeof script.id !== 'string' || typeof script.name !== 'string') {
          throw new Error(`${baseErrMsg} Each script object should have at least an .id and .name property.`)
        }

        if (script.id.trim() === '' || script.name.trim() === '') {
          throw new Error(`${baseErrMsg} Each script object should have a non-empty .id and .name property.`)
        }
      }

      const scripts = parsed as ScriptItem[]
      return scripts
    },
    [],
    {
      initialData: [],
      failureToastOptions: {
        title: "Couldn't resolve user scripts of Hammerspoon"
      }
    }
  )

  let targetScripts: ScriptItem[] = scriptItems

  if (error) {
    targetScripts = []
  }

  const listContentEl = (
    <List.Section title={'User Scripts'}>{renderListItems(targetScripts, revalidateScripts)}</List.Section>
  )

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Type to search...">
      {listContentEl}
    </List>
  )
}

function renderListItems(items: ScriptItem[], revalidateScripts: () => void) {
  return items.map((item) => {
    return (
      <List.Item
        key={item.id}
        icon={{ source: Icon.Bolt, tintColor: Color.Yellow }}
        title={item.name}
        keywords={item.keywords ?? []}
        subtitle={{ value: item.description, tooltip: item.description }}
        actions={
          <ActionPanel>
            <Action
              title="Execute Script"
              icon={{ source: Icon.PlayFilled, tintColor: Color.Yellow }}
              onAction={async () => {
                const preferences = getPreferenceValues()

                // NOTE: we sanitize the script id to avoid Lua syntax errors caused by double-quotes or escape sensitive characters
                try {
                  const output = await runAppleScript(
                    `
                    ;(() => {
                      const app = Application('Hammerspoon')
                      const output = app.executeLuaCode(\`
                        local ok, sanitizedId = pcall(function() return hs.json.decode('${JSON.stringify(item.id)}') end)

                        if not ok then
                          return hs.json.encode({ error = "Failed to decode script id" })
                        end

                        if ${preferences.scriptsVariableName} and type(${preferences.scriptsVariableName}.execute) == 'function' then
                          ${preferences.scriptsVariableName}.execute(sanitizedId)
                          return
                        end

                        return hs.json.encode({ error = "Could not find scripts variable '${
                          preferences.scriptsVariableName
                        }' or it does not have a .execute function. Make sure it exists in your Hammerspoon configuration file or that it is a valid object with functions" })
                      \`)
                      return output
                    })()
                  `,
                    { language: 'JavaScript' }
                  )

                  if (output !== '') {
                    let parsed
                    try {
                      parsed = JSON.parse(output)
                    } catch {
                      throw new Error(output)
                    }

                    if (parsed.error) {
                      throw new Error(parsed.error)
                    }
                  }
                } catch (error) {
                  await showFailureToast(error, { title: 'Script Execution Failed' })
                  return
                }

                await closeMainWindow({ clearRootSearch: true })
              }}
            />
            <Action
              title="Refresh"
              onAction={revalidateScripts}
              shortcut={{ modifiers: ['cmd'], key: 'r' }}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    )
  })
}
