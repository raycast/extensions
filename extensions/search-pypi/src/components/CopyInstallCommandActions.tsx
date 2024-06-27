import type { Keyboard } from '@raycast/api'
import { getPreferenceValues, Action } from '@raycast/api'

type PackageManager = 'pip' | 'pdm' | 'poetry'
interface Preferences {
  defaultCopyAction: PackageManager
  secondaryCopyAction: PackageManager
}

interface PackageManagerItem {
  name: string
  packageManager: PackageManager
  installCommand: string
}

const packageManagers: PackageManagerItem[] = [
  {
    name: 'pip',
    packageManager: 'pip',
    installCommand: 'install',
  },
  {
    name: 'pdm',
    packageManager: 'pdm',
    installCommand: 'add',
  },
  {
    name: 'poetry',
    packageManager: 'poetry',
    installCommand: 'add',
  },
]

const defaultShortcut: Keyboard.Shortcut = {
  key: 'c',
  modifiers: ['shift', 'cmd'],
}
const alternateShortcut: Keyboard.Shortcut = {
  key: 'c',
  modifiers: ['opt', 'cmd'],
}

interface CopyInstallCommandActionsProps {
  packageName: string
}
export const CopyInstallCommandActions = ({
  packageName,
}: CopyInstallCommandActionsProps) => {
  const { defaultCopyAction, secondaryCopyAction }: Preferences =
    getPreferenceValues()

  const copyActions = packageManagers
    .sort((a) => {
      const isPrimary = defaultCopyAction === a.packageManager
      const isSecondary = secondaryCopyAction === a.packageManager
      if (isPrimary) {
        return -1
      } else if (isSecondary) {
        return 0
      } else {
        return 1
      }
    })
    .map(({ name, packageManager, installCommand }) => {
      const isPrimary = defaultCopyAction === packageManager
      const isSecondary = secondaryCopyAction === packageManager
      const title = `Copy ${name} Install Command`
      const shortcut = isPrimary
        ? defaultShortcut
        : isSecondary
          ? alternateShortcut
          : undefined
      return (
        <Action.CopyToClipboard
          title={title}
          content={`${packageManager} ${installCommand} ${packageName}`}
          shortcut={shortcut}
          key={packageManager}
        />
      )
    })

  return <>{copyActions}</>
}
