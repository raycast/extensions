import {
  getPreferenceValues,
  KeyboardShortcut,
  CopyToClipboardAction,
} from '@raycast/api'

interface Preferences {
  defaultCopyAction: 'yarn' | 'npm'
}

interface CopyInstallCommandActionsProps {
  name: string
}

export const CopyInstallCommandActions = ({
  name,
}: CopyInstallCommandActionsProps) => {
  const { defaultCopyAction }: Preferences = getPreferenceValues()

  const defaultShortcut: KeyboardShortcut = {
    key: 'c',
    modifiers: ['shift', 'cmd'],
  }
  const alternateShortcut: KeyboardShortcut = {
    key: 'c',
    modifiers: ['opt', 'cmd'],
  }

  const yarnAction = (
    <CopyToClipboardAction
      title="Copy Yarn Install Command"
      content={`yarn add ${name}`}
      shortcut={
        defaultCopyAction === 'yarn' ? defaultShortcut : alternateShortcut
      }
    />
  )

  const npmAction = (
    <CopyToClipboardAction
      title="Copy npm Install Command"
      content={`npm install ${name}`}
      shortcut={
        defaultCopyAction === 'npm' ? defaultShortcut : alternateShortcut
      }
    />
  )
  return (
    <>
      {defaultCopyAction === 'npm' ? (
        <>
          {npmAction}
          {yarnAction}
        </>
      ) : (
        <>
          {yarnAction}
          {npmAction}
        </>
      )}
    </>
  )
}
