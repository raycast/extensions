import path from 'path'
import fs from 'node:fs/promises'
import {
  ActionPanel,
  Action,
  List,
  Icon,
  getPreferenceValues,
  Detail,
  openCommandPreferences,
  type Application,
} from '@raycast/api'
import { usePromise } from '@raycast/utils'

type Preferences = {
  projectsDir: string
  openWithApp: Application
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>()
  console.log(preferences)

  const { isLoading, data, error } = usePromise(async () => {
    const searchResults = [...(await getProjects(preferences.projectsDir))]
    return searchResults
  })

  if (error) {
    return (
      <Detail
        markdown="Something went wrong... Make sure command preferences are set correctly."
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openCommandPreferences}
            />
          </ActionPanel>
        }
      />
    )
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      filtering
    >
      <List.EmptyView title="No projects found" />
      <List.Section title="Results" subtitle={data?.length + ''}>
        {data?.map(searchResult => (
          <List.Item
            key={searchResult.fullPath}
            title={searchResult.dir}
            subtitle={tildeifyHomePath(searchResult.fullPath)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Open
                    title={`Open in ${preferences.openWithApp.localizedName ?? preferences.openWithApp.name}`}
                    icon={Icon.Code}
                    target={searchResult.fullPath}
                    application={{
                      name: preferences.openWithApp.name,
                      path: preferences.openWithApp.path,
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

function tildeifyHomePath(path: string) {
  if (process.env.HOME && path.includes(process.env.HOME)) {
    return path.replace(process.env.HOME, '~')
  }
  return path
}

async function getProjects(parentDir: string) {
  const codeDir = (await fs.readdir(parentDir)).filter(isHidden)
  const choices: Array<{ dir: string; fullPath: string }> = []
  for (const dir of codeDir) {
    let fullPath = dir
    if (!path.isAbsolute(dir)) {
      fullPath = path.join(parentDir, dir)
    }
    if (fullPath.includes('/node_modules/')) continue
    if (fullPath.includes('/build/')) continue
    if (fullPath.includes('/dist/')) continue
    if (fullPath.includes('/coverage/')) continue

    const pkgjson = path.join(fullPath, 'package.json')
    if (await isFile(pkgjson)) {
      choices.push({
        dir,
        fullPath,
      })
    } else if (await isDirectory(fullPath)) {
      choices.push(...(await getProjects(fullPath)))
    }
  }
  return choices
}

async function isDirectory(filePath: string) {
  try {
    const stat = await fs.stat(filePath)
    return stat.isDirectory()
  } catch {
    return false
  }
}

async function isFile(filePath: string) {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

function isHidden(filePath: string) {
  return !/^\..*/.test(filePath)
}
