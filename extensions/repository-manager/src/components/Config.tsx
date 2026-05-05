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
            const configDir = path.join(project.fullPath, '.raycast')
            const configPath = path.join(configDir, 'repository-manager.json')
            await fs.mkdir(configDir, { recursive: true })

            const defaultConfig = getDefaultProjectConfig(project)
            await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2))

            clearCache()

            // Append '.raycast' to the end of .gitignore file inside project directory
            const gitIgnoreLines = '\n\n# Raycast Repository Manager config file\n.raycast\n'
            const gitIgnorePath = `${project.fullPath}/.gitignore`

            if (existsSync(gitIgnorePath)) {
                await fs.appendFile(gitIgnorePath, gitIgnoreLines)
            }

            // Check if editorApp is configured before trying to open
            if (preferences.editorApp?.path) {
                await open(configPath, preferences.editorApp.path)
            } else {
                await open(configPath)
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

    async function validateConfig() {
        try {
            const config = JSON.parse(await fs.readFile(project.configPath, 'utf8'))

            if (config.urls && typeof config.urls !== 'object') {
                throw new Error('`urls` must be an object')
            }

            if (config.dynamicUrlElements && !Array.isArray(config.dynamicUrlElements)) {
                throw new Error('`dynamicUrlElements` must be an array')
            }

            if (config.developmentCommand?.apps && !Array.isArray(config.developmentCommand.apps)) {
                throw new Error('`developmentCommand.apps` must be an array')
            }

            if (config.developmentCommand?.urls && !Array.isArray(config.developmentCommand.urls)) {
                throw new Error('`developmentCommand.urls` must be an array')
            }

            await showSuccessToast('Config file is valid')
        } catch (error) {
            console.error('Failed to validate config:', error)
            const message = error instanceof Error ? error.message : 'Invalid config file'
            await showErrorToast('Config file is invalid', message)
        }
    }

    async function migrateLegacyConfig() {
        try {
            const preferredConfigPath = path.join(project.fullPath, '.raycast', 'repository-manager.json')

            if (existsSync(preferredConfigPath)) {
                await showErrorToast('Migration skipped', 'repository-manager.json already exists')
                return
            }

            await fs.rename(project.configPath, preferredConfigPath)
            clearCache()
            await showSuccessToast('Config file migrated', 'Renamed to repository-manager.json')
        } catch (error) {
            console.error('Failed to migrate config:', error)
            await showErrorToast('Failed to migrate config file')
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
                title="Validate Config"
                key="validate-config"
                icon={Icon.CheckCircle}
                onAction={validateConfig}
            />
            {project.hasLegacyConfig && (
                <Action
                    title="Migrate Config Filename"
                    key="migrate-config"
                    icon={Icon.ArrowClockwise}
                    onAction={migrateLegacyConfig}
                />
            )}
            <Action
                title="Delete Config"
                key="delete-config"
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                onAction={deleteConfig}
            />
        </ActionPanel.Submenu>
    )
}
