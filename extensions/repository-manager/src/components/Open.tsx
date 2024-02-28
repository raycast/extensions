import { Action, ActionPanel, Icon, Keyboard, open } from '@raycast/api'
import { Project } from '../project'
import { openUrl, preferences, resizeEditorWindow } from '../helpers'
import { withToast } from '../ui/toast'

type OpenProps = {
    project: Project
}

type ActionProps = {
    icon?: Icon
    shortcut?: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent }
}

export function OpenInEditor({ project }: OpenProps) {
    return (
        <Action
            title={`Open in ${preferences.editorApp.name}`}
            key={`open-${preferences.editorApp.name}`}
            icon={{ fileIcon: preferences.editorApp.path }}
            onAction={withToast({
                action: () => {
                    open(project.fullPath, preferences.editorApp.path)
                    return resizeEditorWindow(preferences.editorApp)
                },
                onSuccess: () => `Opening project in ${preferences.editorApp.name}`,
                onFailure: () => `Failed to open project in ${preferences.editorApp.name}`,
            })}
        />
    )
}

export function OpenInTerminal({ project }: OpenProps) {
    return (
        <Action
            title={`Open in ${preferences.terminalApp.name}`}
            key={`open-${preferences.terminalApp.name}`}
            icon={{ fileIcon: preferences.terminalApp.path }}
            shortcut={{ modifiers: ['cmd'], key: 't' }}
            onAction={withToast({
                action: () => {
                    return open(project.fullPath, preferences.terminalApp.path)
                },
                onSuccess: () => `Opening project in ${preferences.terminalApp.name}`,
                onFailure: () => `Failed to open project in ${preferences.terminalApp.name}`,
            })}
        />
    )
}

function OpenUrlAction(key: string, value: string, props: ActionProps = {}) {
    return (
        <Action
            key={key}
            title={`Open ${key} URL`}
            {...props}
            onAction={withToast({
                action: async () => {
                    await openUrl(value)
                },
                onSuccess: () => `Opening ${key} URL`,
                onFailure: () => `Failed to open ${key} URL`,
            })}
        />
    )
}

export function OpenUrl({ project }: OpenProps) {
    const urlEntries = Object.entries(project.config.urls || {})

    if (urlEntries.length === 1) {
        const [key, value] = urlEntries[0]

        if (!value) {
            return null
        }

        return OpenUrlAction(key, value, { icon: Icon.Globe, shortcut: { modifiers: ['cmd'] as Keyboard.KeyModifier[], key: 'o' as Keyboard.KeyEquivalent } })
    }

    return (
        <ActionPanel.Submenu
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{ modifiers: ['cmd'] as Keyboard.KeyModifier[], key: 'o' as Keyboard.KeyEquivalent }}
        >
            {urlEntries.map(([key, value]) => value && OpenUrlAction(key, value))}
        </ActionPanel.Submenu>
    )
}
