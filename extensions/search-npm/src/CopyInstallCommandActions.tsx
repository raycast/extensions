import { getPreferenceValues, Action, Keyboard } from '@raycast/api'

type Registries = 'yarn' | 'npm' | 'pnpm'
interface Preferences {
  defaultCopyAction: Registries
  secondaryCopyAction: Registries
}

interface RegistryItem {
  name: string
  registry: Registries
}
const registries: RegistryItem[] = [
  {
    name: 'Yarn',
    registry: 'yarn',
  },
  {
    name: 'npm',
    registry: 'npm',
  },
  {
    name: 'pnpm',
    registry: 'pnpm',
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
    .map(({ name, registry }) => {
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
          content={`${registry} install ${packageName}`}
          shortcut={shortcut}
          key={registry}
        />
      )
    })

  return <>{copyActions}</>
}
