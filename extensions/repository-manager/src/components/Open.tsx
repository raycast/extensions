import { Action, ActionPanel, Icon, Keyboard, open } from '@raycast/api'
import { Project } from '../project'
import { openUrl, preferences, resizeEditorWindow } from '../helpers'
import { showSuccessToast, showErrorToast } from '../ui/toast'

type OpenProps = {
    project: Project
}

type ActionProps = {
    icon?: Icon
    shortcut?: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent }
}

export function OpenInEditor({ project }: OpenProps) {
    async function handleOpenInEditor() {
        try {
            if (!preferences.editorApp?.name || !preferences.editorApp?.path) {
                throw new Error('Editor app not configured')
            }

            await open(project.fullPath, preferences.editorApp.path)
            await resizeEditorWindow(preferences.editorApp)
            await showSuccessToast(`Opening project in ${preferences.editorApp.name}`)
        } catch (error) {
            if (error instanceof Error && error.message === 'Editor app not configured') {
                await showErrorToast('Please configure your preferred editor in preferences')
            } else {
                await showErrorToast(`Failed to open project in ${preferences.editorApp?.name || 'editor'}`)
            }
        }
    }

    if (!preferences.editorApp?.name || !preferences.editorApp?.path) {
        return (
            <Action
                title="Open in Editor"
                icon={Icon.Code}
                onAction={() => showErrorToast('Please configure your preferred editor in preferences')}
            />
        )
    }

    return (
        <Action
            title={`Open in ${preferences.editorApp.name}`}
            key={`open-${preferences.editorApp.name}`}
            icon={{ fileIcon: preferences.editorApp.path }}
            onAction={handleOpenInEditor}
        />
    )
}

export function OpenInTerminal({ project }: OpenProps) {
    async function handleOpenInTerminal() {
        try {
            if (!preferences.terminalApp?.name || !preferences.terminalApp?.path) {
                throw new Error('Terminal app not configured')
            }

            await open(project.fullPath, preferences.terminalApp.path)
            await showSuccessToast(`Opening project in ${preferences.terminalApp.name}`)
        } catch (error) {
            if (error instanceof Error && error.message === 'Terminal app not configured') {
                await showErrorToast('Please configure your preferred terminal in preferences')
            } else {
                await showErrorToast(`Failed to open project in ${preferences.terminalApp?.name || 'terminal'}`)
            }
        }
    }

    if (!preferences.terminalApp?.name || !preferences.terminalApp?.path) {
        return (
            <Action
                title="Open in Terminal"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ['cmd'], key: 't' }}
                onAction={() => showErrorToast('Please configure your preferred terminal in preferences')}
            />
        )
    }

    return (
        <Action
            title={`Open in ${preferences.terminalApp.name}`}
            key={`open-${preferences.terminalApp.name}`}
            icon={{ fileIcon: preferences.terminalApp.path }}
            shortcut={{ modifiers: ['cmd'], key: 't' }}
            onAction={handleOpenInTerminal}
        />
    )
}

function OpenUrlAction(key: string, value: string, props: ActionProps = {}) {
    async function handleOpenUrl() {
        try {
            await openUrl(value)
            await showSuccessToast(`Opening ${key} URL`)
        } catch (error) {
            await showErrorToast(`Failed to open ${key} URL`)
        }
    }

    return (
        <Action
            key={key}
            title={`Open ${key} URL`}
            {...props}
            onAction={handleOpenUrl}
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

        return OpenUrlAction(key, value, {
            icon: Icon.Globe,
            shortcut: {
                modifiers: ['cmd'] as Keyboard.KeyModifier[],
                key: 'o' as Keyboard.KeyEquivalent,
            },
        })
    }

    return (
        <ActionPanel.Submenu
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={{
                modifiers: ['cmd'] as Keyboard.KeyModifier[],
                key: 'o' as Keyboard.KeyEquivalent,
            }}
        >
            {urlEntries.map(([key, value]) => value && OpenUrlAction(key, value))}
        </ActionPanel.Submenu>
    )
}
