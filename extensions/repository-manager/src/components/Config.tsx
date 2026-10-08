import { Action, ActionPanel, Color, Form, Icon, confirmAlert, open, useNavigation } from '@raycast/api'
import { Project, ProjectConfig, getDefaultProjectConfig } from '../project'
import { clearCache, preferences } from '../helpers'
import fs from 'fs/promises'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { showSuccessToast, showErrorToast } from '../ui/toast'
import { DevelopmentCommandApp } from './StartDevelopment'

type ConfigProps = {
    project: Project
    onConfigChange?: () => void
}

type ConfigWizardProps = ConfigProps

type RawProjectConfig = ProjectConfig & Record<string, unknown>

type ConfigWizardValues = {
    name: string
    description: string
    urls: string
    dynamicUrlElements: string
    openInEditor: boolean
    openInTerminal: boolean
    developmentUrls: string
}

function getPreferredConfigPath(project: Project): string {
    return path.join(project.fullPath, '.raycast', 'repository-manager.json')
}

function getRawProjectConfig(project: Project): { config: RawProjectConfig; error: string | null } {
    if (!existsSync(project.configPath)) {
        return { config: getDefaultProjectConfig(project) as RawProjectConfig, error: null }
    }

    try {
        return {
            config: JSON.parse(readFileSync(project.configPath, 'utf8')) as RawProjectConfig,
            error: null,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse config file'
        return { config: getDefaultProjectConfig(project) as RawProjectConfig, error: message }
    }
}

function formatKeyValueLines(values: Record<string, string> | undefined): string {
    return Object.entries(values || {})
        .map(([key, value]) => `${key}=${value}`)
        .join('\n')
}

function formatDynamicUrlElements(values: ProjectConfig['dynamicUrlElements']): string {
    return (values || []).map((element) => `${element.key}=${element.value}`).join('\n')
}

function formatLines(values: string[] | undefined): string {
    return (values || []).join('\n')
}

function parseKeyValueLines(value: string, fieldTitle: string): Record<string, string> {
    return value.split('\n').reduce<Record<string, string>>((parsedValues, rawLine, index) => {
        const line = rawLine.trim()

        if (!line) {
            return parsedValues
        }

        const separatorIndex = line.indexOf('=')

        if (separatorIndex <= 0) {
            throw new Error(`${fieldTitle} line ${index + 1} must use key=value`)
        }

        const key = line.slice(0, separatorIndex).trim()
        const lineValue = line.slice(separatorIndex + 1).trim()

        if (!key) {
            throw new Error(`${fieldTitle} line ${index + 1} must include a key`)
        }

        parsedValues[key] = lineValue
        return parsedValues
    }, {})
}

function parseDynamicUrlElements(value: string): NonNullable<ProjectConfig['dynamicUrlElements']> {
    return Object.entries(parseKeyValueLines(value, 'Dynamic placeholders')).map(([key, lineValue]) => ({
        key,
        value: lineValue,
    }))
}

function parseListLines(value: string): string[] {
    return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
}

async function ensureConfigDirIgnored(project: Project): Promise<void> {
    const gitIgnorePath = path.join(project.fullPath, '.gitignore')

    if (!existsSync(gitIgnorePath)) {
        return
    }

    const gitIgnoreContent = await fs.readFile(gitIgnorePath, 'utf8')
    const hasRaycastEntry = gitIgnoreContent.split(/\r?\n/).some((line) => {
        const trimmedLine = line.trim()
        return trimmedLine === '.raycast' || trimmedLine === '.raycast/'
    })

    if (hasRaycastEntry) {
        return
    }

    const separator = gitIgnoreContent.endsWith('\n') ? '\n' : '\n\n'
    await fs.appendFile(gitIgnorePath, `${separator}# Raycast Repository Manager config file\n.raycast\n`)
}

function ConfigWizard({ project, onConfigChange }: ConfigWizardProps) {
    const { pop } = useNavigation()
    const rawConfigResult = getRawProjectConfig(project)
    const rawConfig = rawConfigResult.config
    const developmentApps = rawConfig.developmentCommand?.apps || []

    async function handleSubmit(values: ConfigWizardValues) {
        try {
            if (rawConfigResult.error && existsSync(project.configPath)) {
                throw new Error(`Fix the JSON config before using the wizard: ${rawConfigResult.error}`)
            }

            const nextConfig: RawProjectConfig = { ...rawConfig }
            const name = values.name.trim()
            const description = values.description.trim()
            const urls = parseKeyValueLines(values.urls || '', 'URLs')
            const dynamicUrlElements = parseDynamicUrlElements(values.dynamicUrlElements || '')
            const developmentUrls = parseListLines(values.developmentUrls || '')
            const apps: DevelopmentCommandApp[] = []

            if (values.openInEditor) {
                apps.push(DevelopmentCommandApp.Editor)
            }

            if (values.openInTerminal) {
                apps.push(DevelopmentCommandApp.Terminal)
            }

            if (name) {
                nextConfig.name = name
            } else {
                delete nextConfig.name
            }

            if (description) {
                nextConfig.description = description
            } else {
                delete nextConfig.description
            }

            if (Object.keys(urls).length > 0) {
                nextConfig.urls = urls
            } else {
                delete nextConfig.urls
            }

            if (dynamicUrlElements.length > 0) {
                nextConfig.dynamicUrlElements = dynamicUrlElements
            } else {
                delete nextConfig.dynamicUrlElements
            }

            if (apps.length > 0 || developmentUrls.length > 0) {
                nextConfig.developmentCommand = {
                    apps,
                    urls: developmentUrls,
                }
            } else {
                delete nextConfig.developmentCommand
            }

            const configDir = path.join(project.fullPath, '.raycast')
            const configPath = getPreferredConfigPath(project)

            await fs.mkdir(configDir, { recursive: true })
            await fs.writeFile(configPath, JSON.stringify(nextConfig, null, 2))
            await ensureConfigDirIgnored(project)
            clearCache(false)
            onConfigChange?.()
            pop()
            await showSuccessToast('Config saved')
        } catch (error) {
            console.error('Failed to save config:', error)
            const message = error instanceof Error ? error.message : 'Failed to save config'
            await showErrorToast('Failed to save config', message)
        }
    }

    return (
        <Form
            navigationTitle={`${project.name} Config`}
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Save Config"
                        icon={Icon.CheckCircle}
                        onSubmit={handleSubmit}
                    />
                </ActionPanel>
            }
        >
            {rawConfigResult.error && (
                <Form.Description
                    title="Config Parse Error"
                    text={rawConfigResult.error}
                />
            )}
            <Form.TextField
                id="name"
                title="Name"
                defaultValue={rawConfig.name || project.name}
            />
            <Form.TextArea
                id="description"
                title="Description"
                defaultValue={rawConfig.description || ''}
            />
            <Form.TextArea
                id="urls"
                title="URLs"
                placeholder="local={project}.test"
                defaultValue={formatKeyValueLines(rawConfig.urls)}
            />
            <Form.TextArea
                id="dynamicUrlElements"
                title="Dynamic Placeholders"
                placeholder="project=custom-value"
                defaultValue={formatDynamicUrlElements(rawConfig.dynamicUrlElements)}
            />
            <Form.Checkbox
                id="openInEditor"
                label="Open editor when starting development"
                defaultValue={developmentApps.includes(DevelopmentCommandApp.Editor)}
            />
            <Form.Checkbox
                id="openInTerminal"
                label="Open terminal when starting development"
                defaultValue={developmentApps.includes(DevelopmentCommandApp.Terminal)}
            />
            <Form.TextArea
                id="developmentUrls"
                title="Development URLs"
                placeholder="{urls.local}"
                defaultValue={formatLines(rawConfig.developmentCommand?.urls)}
            />
        </Form>
    )
}

export default function Config({ project, onConfigChange }: ConfigProps) {
    const hasConfigFile = existsSync(project.configPath)

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
            const preferredConfigPath = getPreferredConfigPath(project)

            if (existsSync(preferredConfigPath)) {
                await showErrorToast('Migration skipped', 'repository-manager.json already exists')
                return
            }

            await fs.rename(project.configPath, preferredConfigPath)
            clearCache(false)
            onConfigChange?.()
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
            clearCache(false)
            onConfigChange?.()
            await showSuccessToast('Config file has been deleted')
        } catch (error) {
            console.error('Failed to delete config:', error)
            await showErrorToast('Failed to delete config file')
        }
    }

    if (!hasConfigFile) {
        return (
            <Action.Push
                title="Open Config Wizard"
                key="open-config-wizard"
                icon={Icon.Plus}
                shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
                target={
                    <ConfigWizard
                        project={project}
                        onConfigChange={onConfigChange}
                    />
                }
            />
        )
    }

    return (
        <ActionPanel.Submenu
            title="Manage Config"
            icon={Icon.Gear}
            shortcut={{ modifiers: ['cmd', 'shift'], key: ',' }}
        >
            <Action.Push
                title="Edit in Wizard"
                key="edit-config-wizard"
                icon={Icon.Pencil}
                target={
                    <ConfigWizard
                        project={project}
                        onConfigChange={onConfigChange}
                    />
                }
            />
            <Action
                title="Edit JSON"
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
