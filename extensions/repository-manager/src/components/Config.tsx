import { Action, ActionPanel, Color, Icon, confirmAlert, open } from '@raycast/api'
import { Project, getDefaultProjectConfig } from '../project'
import { clearCache, preferences } from '../helpers'
import fs from 'fs'
import { exec } from 'child_process'
import { withToast } from '../ui/toast'

type ConfigProps = {
    project: Project
}

export default function Config({ project }: ConfigProps) {
    async function createConfig() {
        exec(`mkdir -p "$(dirname "${project.configPath}")" && touch "${project.configPath}"`, (error) => {
            if (error) {
                return
            }

            const defaultConfig = getDefaultProjectConfig(project)

            fs.writeFile(project.configPath, JSON.stringify(defaultConfig), (err) => {
                if (err) {
                    return
                }

                clearCache()

                // append '.raycast' to the end of .gitignore file inside project directory
                const gitIgnoreLines = '\n\n# Raycast Repository Manager config file\n.raycast\n'

                fs.appendFile(`${project.fullPath}/.gitignore`, gitIgnoreLines, (err) => {
                    if (err) {
                        return
                    }
                })
            })

            open(project.configPath, preferences.editorApp.path)
        })
    }

    async function editConfig() {
        open(project.configPath, preferences.editorApp.path)
    }

    async function deleteConfig() {
        const confirmed = await confirmAlert({
            title: 'Delete Config',
            message: 'Are you sure you want to delete config file?',
            icon: { source: Icon.Trash, tintColor: Color.Red },
        })

        if (!confirmed) {
            return Promise.reject()
        }

        return new Promise<void>((resolve, reject) => {
            fs.unlink(project.configPath, (err) => {
                if (err) {
                    reject('Failed to delete config file')
                    return
                }

                clearCache()
                resolve()
            })
        })
    }

    if (!project.hasConfig) {
        return (
            <Action
                title="Create Config"
                key="create-config"
                icon={Icon.Plus}
                shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
                onAction={withToast({
                    action: createConfig,
                    onSuccess: () => 'Config file has been created',
                    onFailure: () => 'Failed to create config file',
                })}
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
                onAction={withToast({
                    action: deleteConfig,
                    onSuccess: () => 'Config file has been deleted',
                    onFailure: () => 'Failed to delete config file',
                })}
            />
        </ActionPanel.Submenu>
    )
}
