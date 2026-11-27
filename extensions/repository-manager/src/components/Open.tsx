import { projectShortcut } from '../platform'
import { Action, ActionPanel, Icon, Keyboard } from '@raycast/api'
import { Project } from '../project'
import { markProjectOpened, openUrl, preferences } from '../helpers'
import { showSuccessToast, showErrorToast } from '../ui/toast'

import { openProjectInEditor, openProjectInTerminal } from '../launch'

type OpenProps = {
    project: Project
}

type ActionProps = {
    icon?: Icon
    shortcut?: Keyboard.Shortcut
}

export function OpenInEditor({ project }: OpenProps) {
    async function handleOpenInEditor() {
        try {
            if (!preferences.editorApp?.name || !preferences.editorApp?.path) {
                throw new Error('Editor app not configured')
            }

            await openProjectInEditor(project.fullPath)
            await markProjectOpened(project)
            await showSuccessToast(`Opening project in ${preferences.editorApp.name}`)
        } catch (error) {
            if (error instanceof Error && error.message === 'Editor app not configured') {
                await showErrorToast('Please configure your preferred editor in preferences')
            } else {
                await showErrorToast(`Failed to open project in ${preferences.editorApp?.name || 'editor'}`, error instanceof Error ? error.message : undefined)
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
    const terminal = preferences.terminalApp

    async function handleOpenInTerminal() {
        try {
            await openProjectInTerminal(project.fullPath)
            await markProjectOpened(project)
            await showSuccessToast(`Opening project in ${terminal?.name || 'terminal'}`)
        } catch (error) {
            await showErrorToast(`Failed to open project in ${terminal?.name || 'terminal'}`, error instanceof Error ? error.message : undefined)
        }
    }

    return (
        <Action
            title={terminal?.name ? `Open in ${terminal.name}` : 'Open in Terminal'}
            icon={terminal?.path ? { fileIcon: terminal.path } : Icon.Terminal}
            shortcut={projectShortcut('t')}
            onAction={handleOpenInTerminal}
        />
    )
}

function OpenUrlAction(project: Project, key: string, value: string, props: ActionProps = {}) {
    async function handleOpenUrl() {
        try {
            await openUrl(value)
            await markProjectOpened(project)
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

        return OpenUrlAction(project, key, value, {
            icon: Icon.Globe,
            shortcut: projectShortcut('o'),
        })
    }

    return (
        <ActionPanel.Submenu
            title="Open in Browser"
            icon={Icon.Globe}
            shortcut={projectShortcut('o')}
        >
            {urlEntries.map(([key, value]) => value && OpenUrlAction(project, key, value))}
        </ActionPanel.Submenu>
    )
}
