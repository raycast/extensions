import type { Keyboard } from '@raycast/api'
import { getPreferenceValues, Action } from '@raycast/api'

type Registries = 'yarn' | 'npm' | 'pnpm'

interface RegistryItem {
  name: string
  registry: Registries
  installCommand: string
}
const registries: RegistryItem[] = [
  {
    name: 'Yarn',
    registry: 'yarn',
    installCommand: 'add',
  },
  {
    name: 'npm',
    registry: 'npm',
    installCommand: 'install',
  },
  {
    name: 'pnpm',
    registry: 'pnpm',
    installCommand: 'install',
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
    getPreferenceValues<ExtensionPreferences>()

  const copyActions = registries
    .sort((a) => {
      const isPrimary = defaultCopyAction === a.registry
      const isSecondary = secondaryCopyAction === a.registry
      if (isPrimary) {
        return -1
      } else if (isSecondary) {
        return 0
      } else {
        return 1
      }
    })
    .map(({ name, registry, installCommand }) => {
      const isPrimary = defaultCopyAction === registry
      const isSecondary = secondaryCopyAction === registry
      const title = `Copy ${name} Install Command`
      const shortcut = isPrimary
        ? defaultShortcut
        : isSecondary
          ? alternateShortcut
          : undefined
      return (
        <Action.CopyToClipboard
          title={title}
          content={`${registry} ${installCommand} ${packageName}`}
          shortcut={shortcut}
          key={registry}
        />
      )
    })

  return <>{copyActions}</>
}
