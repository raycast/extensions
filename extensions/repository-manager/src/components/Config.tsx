import { Action, ActionPanel, Color, Icon, confirmAlert, open } from '@raycast/api'
import { Project, getDefaultProjectConfig } from '../project'
import { clearCache, preferences } from '../helpers'
import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { showSuccessToast, showErrorToast } from '../ui/toast'

type ConfigProps = {
    project: Project
}

export default function Config({ project }: ConfigProps) {
    async function createConfig() {
        try {
            // Safely create the directory structure using fs.mkdir
            const configDir = path.dirname(project.configPath)
            await fs.mkdir(configDir, { recursive: true })

            const defaultConfig = getDefaultProjectConfig(project)
            await fs.writeFile(project.configPath, JSON.stringify(defaultConfig, null, 2))

            clearCache()

            // Append '.raycast' to the end of .gitignore file inside project directory
            const gitIgnoreLines = '\n\n# Raycast Repository Manager config file\n.raycast\n'
            const gitIgnorePath = `${project.fullPath}/.gitignore`

            if (existsSync(gitIgnorePath)) {
                await fs.appendFile(gitIgnorePath, gitIgnoreLines)
            }

            // Check if editorApp is configured before trying to open
            if (preferences.editorApp?.path) {
                await open(project.configPath, preferences.editorApp.path)
            } else {
                await open(project.configPath)
            }

            await showSuccessToast('Config file has been created')
        } catch (error) {
            console.error('Failed to create config:', error)
            await showErrorToast('Failed to create config file')
        }
    }

    async function editConfig() {
        try {
            // Check if editorApp is configured before trying to open
            if (preferences.editorApp?.path) {
                await open(project.configPath, preferences.editorApp.path)
            } else {
                await open(project.configPath)
            }
        } catch (error) {
            console.error('Failed to open config:', error)
            await showErrorToast('Failed to open config file')
        }
    }

    async function deleteConfig() {
        try {
            const confirmed = await confirmAlert({
                title: 'Delete Config',
                message: 'Are you sure you want to delete config file?',
                icon: { source: Icon.Trash, tintColor: Color.Red },
            })

            if (!confirmed) {
                return
            }

            await fs.unlink(project.configPath)
            clearCache()
            await showSuccessToast('Config file has been deleted')
        } catch (error) {
            console.error('Failed to delete config:', error)
            await showErrorToast('Failed to delete config file')
        }
    }

    if (!project.hasConfig) {
        return (
            <Action
                title="Create Config"
                key="create-config"
                icon={Icon.Plus}
                shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
                onAction={createConfig}
            />
        )
    }

    return (
        <ActionPanel.Submenu
            title="Manage Config"
            icon={Icon.Gear}
            shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
        >
            <Action
                title="Edit Config"
                key="edit-config"
                icon={Icon.Pencil}
                onAction={editConfig}
            />
            <Action
                title="Delete Config"
                key="delete-config"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={deleteConfig}
            />
        </ActionPanel.Submenu>
    )
}
