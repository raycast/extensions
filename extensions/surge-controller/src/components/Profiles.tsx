import actionBoundary from '../utils/actionBoundary'
import useRequire from '../hooks/useRequire'
import { ActionPanel, Icon, List, showToast, Action, Toast, Detail } from '@raycast/api'
import { useCallback, useEffect, useState } from 'react'
import { changeProfile, getCurrentProfile, getProfiles, reloadProfile } from '../api'
import { checkSystemIsIOS, IconIsCurrent } from '../utils'
import { ApiLoaderType, CurrentProfileT } from '../utils/types'

const Profiles = () => {
  const [isIOS, setIsIOS] = useState(true)

  const getProfilesLoader = useCallback<ApiLoaderType>(() => getProfiles(), [isIOS])
  const { response: profileList } = useRequire<string[]>({
    apiLoader: getProfilesLoader,
    defaultData: [],
    disabled: isIOS,
  })

  const { response: currentProfile, setResponse: setCurrentProfile } = useRequire<CurrentProfileT>({
    apiLoader: getCurrentProfile,
    defaultData: {} as CurrentProfileT,
  })

  useEffect(() => {
    ;(async () => {
      const isIOS = await checkSystemIsIOS()
      setIsIOS(isIOS)
    })()
  }, [])

  const onChangeProfileHandle = actionBoundary(async (name: string) => {
    await changeProfile({ name: name })
    currentProfile.name = name
    setCurrentProfile({ ...currentProfile })
    await showToast(Toast.Style.Success, 'Success', `Profile has been changed to "${name}".`)
  })

  const onReloadHandle = actionBoundary(async () => {
    await reloadProfile()
    await showToast(Toast.Style.Success, 'Success', 'Profile has been reloaded.')
  })

  const content = `\`\`\`ini \n${currentProfile.profile} \n\`\`\``

  return (
    <List.Item
      title="Profiles"
      subtitle={currentProfile.name}
      icon={Icon.TextDocument}
      actions={
        <ActionPanel>
          {profileList.length > 0 && (
            <ActionPanel.Submenu title="Switch Profile">
              {profileList.map((name) => (
                <Action
                  key={name}
                  title={name}
                  icon={IconIsCurrent(name === currentProfile.name)}
                  onAction={() => onChangeProfileHandle(name)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <ActionPanel.Submenu title="Reload Profile" shortcut={{ modifiers: ['cmd'], key: 'r' }}>
            <Action title="Yes" onAction={() => onReloadHandle()} />
            <Action title="No" />
          </ActionPanel.Submenu>
          <Action.Push title="Show Profile" target={<Detail markdown={content} />} />
        </ActionPanel>
      }
    />
  )
}

export default Profiles
