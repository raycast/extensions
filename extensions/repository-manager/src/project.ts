import { existsSync, readFileSync } from 'fs'
import { Icon, Image } from '@raycast/api'
import { homedir } from 'os'
import path from 'path'
import gitConfigParser from 'parse-git-config'
// Removed parse-github-url to avoid deprecation warnings
// import gh = require('parse-github-url')
import { getColorForPrimaryDirectory, preferences } from './helpers'
import { Directory } from './components/DirectoriesDropdown'
import { DevelopmentCommandApp } from './components/StartDevelopment'

export interface ProjectConfig {
    name?: string
    description?: string
    urls?: {
        [key: string]: string
    }
    dynamicUrlElements?: { key: string; value: string }[]
    developmentCommand?: {
        apps?: DevelopmentCommandApp[]
        urls?: string[]
    }
}

interface Repo {
    name: string
    host: string
    hostDisplayName: string
    url: string
    icon: Image
}

interface Remote {
    url: string
}

export type ProjectList = Project[]

export type GroupedProjectList = { [key: string]: ProjectList }

const GIT_PROVIDERS = {
    github: {
        lightIcon: 'github-light.png',
        darkIcon: 'github-dark.png',
    },
    gitlab: {
        lightIcon: 'gitlab-light.png',
        darkIcon: 'gitlab-dark.png',
    },
    bitbucket: {
        lightIcon: 'bitbucket-light.png',
        darkIcon: 'bitbucket-dark.png',
    },
    gitness: {
        lightIcon: 'gitness-light.png',
        darkIcon: 'gitness-dark.png',
    },
} as const

export class Project {
    name = ''
    description: string | null = null
    displayPath = ''
    fullPath = ''
    pathParts: string[] = []
    primaryDirectory: Directory = { name: '', icon: null, color: null }
    configPath = ''
    hasConfig = false
    config: ProjectConfig = {}
    gitRemotes: Repo[] = []
    isFavorite = false

    constructor(cachedProject?: Project, projectPath?: string) {
        if (cachedProject) {
            Object.assign(this, cachedProject)
            return
        }

        if (!projectPath) {
            throw new Error('Project path is required')
        }

        this.initializeProject(projectPath)
    }

    private initializeProject(projectPath: string): void {
        this.fullPath = projectPath
        this.displayPath = this.getDisplayPath(projectPath)
        this.pathParts = projectPath.split(path.sep).filter(Boolean)
        this.name = this.pathParts.at(-1) || ''

        this.setPrimaryDirectory()
        this.setConfiguration()
        this.gitRemotes = parseGitRemotes(this.fullPath)
    }

    private getDisplayPath(fullPath: string): string {
        const homeDir = homedir()
        return fullPath.startsWith(homeDir) ? fullPath.replace(homeDir, '~') : fullPath
    }

    private setPrimaryDirectory(): void {
        const parentDirName = this.pathParts.at(-2) || ''
        const color = getColorForPrimaryDirectory(parentDirName)

        this.primaryDirectory = {
            name: parentDirName,
            icon: { source: Icon.HardDrive, tintColor: color },
            color: color,
        }
    }

    private setConfiguration(): void {
        this.configPath = path.join(this.fullPath, '.raycast', 'project-manager.json')

        if (!existsSync(this.configPath)) {
            this.configPath = path.join(this.fullPath, '.raycast', 'repository-manager.json')
        }

        this.config = getProjectConfig(this.fullPath)

        if (Object.keys(this.config).length > 0) {
            this.hasConfig = true
        }

        if (this.config.name) {
            this.name = this.config.name
        }

        if (this.config.description) {
            this.description = this.config.description
        }

        if (!this.config.urls) {
            this.config.urls = {}
        }

        this.config.urls = getProjectCompiledUrls(this)
    }
}

interface ParsedGitUrl {
    host: string | null
    repo: string | null
    protocol: string | null
    path: string | null
}

function parseGitUrl(url: string): ParsedGitUrl {
    if (!url) {
        return { host: null, repo: null, protocol: null, path: null }
    }

    // Normalize malformed URLs first
    let normalizedUrl = url

    // Handle malformed URLs that mix protocols
    if (url.startsWith('http://git@') || url.startsWith('https://git@')) {
        normalizedUrl = url.replace(/^https?:\/\//, '')
    }

    try {
        // SSH format: git@github.com:owner/repo.git
        if (normalizedUrl.includes('@') && normalizedUrl.includes(':') && !normalizedUrl.includes('://')) {
            const sshMatch = normalizedUrl.match(/^(?:.*@)?([^:]+):(.+?)(?:\.git)?$/)
            if (sshMatch) {
                const [, host, path] = sshMatch
                const pathParts = path.split('/')
                const repo = pathParts.length >= 2 ? `${pathParts[0]}/${pathParts[1]}` : path

                return {
                    host,
                    repo: pathParts.length >= 2 ? pathParts[1] : path,
                    protocol: 'ssh',
                    path: repo,
                }
            }
        }

        // HTTPS format: https://github.com/owner/repo.git
        if (normalizedUrl.includes('://')) {
            try {
                const urlObj = new URL(normalizedUrl)
                const pathParts = urlObj.pathname
                    .replace(/^\/|\.git$/g, '')
                    .split('/')
                    .filter(Boolean)

                if (pathParts.length >= 2) {
                    return {
                        host: urlObj.hostname,
                        repo: pathParts[1],
                        protocol: urlObj.protocol.replace(':', ''),
                        path: pathParts.join('/'),
                    }
                }
            } catch (urlError) {
                console.warn(`Failed to parse HTTPS git URL: ${normalizedUrl}`, urlError)
            }
        }

        // Fallback: try to extract basic info with regex
        const fallbackMatch = normalizedUrl.match(/([^/]+)\/([^/]+?)(?:\.git)?$/)
        if (fallbackMatch) {
            const [, owner, repo] = fallbackMatch
            // Try to extract host from earlier in the URL
            const hostMatch = normalizedUrl.match(/(?:@|\/\/)([^/:]+)/)
            const host = hostMatch ? hostMatch[1] : 'unknown'

            return {
                host,
                repo,
                protocol: normalizedUrl.includes('://') ? 'https' : 'ssh',
                path: `${owner}/${repo}`,
            }
        }
    } catch (error) {
        console.warn(`Error parsing git URL "${normalizedUrl}":`, error)
    }

    return { host: null, repo: null, protocol: null, path: null }
}

function parseGitRemotes(fullPath: string): Repo[] {
    try {
        const gitConfigPath = path.join(fullPath, '.git', 'config')

        if (!existsSync(gitConfigPath)) {
            return []
        }

        const gitConfig = gitConfigParser.sync({
            cwd: fullPath,
            path: '.git/config',
            expandKeys: true,
        })

        if (!gitConfig.remote) {
            return []
        }

        const repos: Repo[] = []

        for (const remoteName in gitConfig.remote) {
            const config = gitConfig.remote[remoteName] as Remote

            try {
                // Use custom parser to avoid deprecation warnings
                const parsed = parseGitUrl(config.url)

                if (!parsed?.host || !parsed?.repo) {
                    console.warn(`Skipping malformed git remote URL: ${config.url}`)
                    continue
                }

                const icon = createProviderIcon(parsed.host)
                const url = buildRepositoryUrl(parsed)

                repos.push({
                    name: remoteName,
                    host: parsed.host,
                    hostDisplayName: getHostDisplayName(parsed.host),
                    url,
                    icon,
                })
            } catch (urlError) {
                console.warn(`Failed to parse git remote URL "${config.url}":`, urlError)
                continue
            }
        }

        return repos
    } catch (error) {
        console.error(`Failed to parse git remotes for ${fullPath}:`, error)
        return []
    }
}

function createProviderIcon(host: string): Image {
    const defaultIcon = {
        source: {
            light: Icon.Globe as Icon | string,
            dark: Icon.Globe as Icon | string,
        },
    }

    for (const [provider, icons] of Object.entries(GIT_PROVIDERS)) {
        if (host.includes(provider)) {
            return {
                source: {
                    light: icons.lightIcon,
                    dark: icons.darkIcon,
                },
            }
        }
    }

    return defaultIcon
}

function buildRepositoryUrl(parsed: ParsedGitUrl): string {
    // Always use HTTPS for repository URLs that will be opened in browser
    const protocol = 'https'

    if (parsed?.host?.includes('gitness')) {
        const cleanPath = parsed?.path?.replace('git/', '')?.replace('.git', '')
        return `${protocol}://${parsed.host}/${cleanPath}`
    }

    // Use the full path (owner/repo) instead of just repo name
    return `${protocol}://${parsed?.host}/${parsed?.path || ''}`
}

function getHostDisplayName(host: string): string {
    const hostPart = host.split('.')[0]
    return hostPart.charAt(0).toUpperCase() + hostPart.slice(1)
}

function getProjectConfig(fullPath: string): ProjectConfig {
    const configDir = path.join(fullPath, '.raycast')
    const configFile = path.join(configDir, 'project-manager.json')

    if (!existsSync(configDir) || !existsSync(configFile)) {
        return {}
    }

    try {
        const configContent = JSON.parse(readFileSync(configFile, 'utf8'))
        return configContent
    } catch (error) {
        console.error(`Failed to parse project config for ${fullPath}:`, error)
        return {}
    }
}

function getProjectCompiledUrls(project: Project): { [key: string]: string } {
    const compiledUrls: { [key: string]: string } = {}

    const localTemplate = project.config?.urls?.local || preferences.localProjectUrlTemplate
    const localUrl = getProjectUrl(project, localTemplate)

    if (localUrl) {
        compiledUrls.local = localUrl
    }

    if (project.config.urls) {
        for (const [key, urlTemplate] of Object.entries(project.config.urls)) {
            const compiledUrl = getProjectUrl(project, urlTemplate)
            if (compiledUrl) {
                compiledUrls[key] = compiledUrl
            }
        }
    }

    return compiledUrls
}

export function getProjectUrl(project: Project, urlTemplate: string | undefined): string | null {
    if (!urlTemplate) {
        return null
    }

    let url = urlTemplate

    // Replace dynamic placeholders first
    if (project.config?.dynamicUrlElements) {
        for (const element of project.config.dynamicUrlElements) {
            url = url.replace(`{${element.key}}`, element.value)
        }
    }

    // Replace project placeholder if not already replaced
    url = url.replace('{project}', project.name)

    // Add protocol if missing
    if (!/^(\w+):\/\//.test(url)) {
        url = `http://${url}`
    }

    return url
}

export const getDefaultProjectConfig = (project: Project): ProjectConfig => {
    return {
        name: project.name,
        description: project.description || undefined,
        urls: {
            local: '{project}.test',
            staging: 'staging.{project}.com',
            production: '{project}.com',
        },
        dynamicUrlElements: [
            {
                key: 'project',
                value: 'custom-value',
            },
        ],
        developmentCommand: {
            apps: [DevelopmentCommandApp.Editor],
            urls: ['{urls.local}'],
        },
    }
}

export function groupByDirectory(projects: ProjectList): GroupedProjectList {
    return projects.reduce((acc: GroupedProjectList, project: Project) => {
        const key = project.primaryDirectory.name

        if (!acc[key]) {
            acc[key] = []
        }

        acc[key].push(project)
        return acc
    }, {})
}

export function sortGroupedProjectsByFavorite(groupedProjects: GroupedProjectList): GroupedProjectList {
    const sortedGroups: GroupedProjectList = {}

    for (const [directoryName, projects] of Object.entries(groupedProjects)) {
        sortedGroups[directoryName] = [...projects].sort((a, b) => {
            if (a.isFavorite === b.isFavorite) {
                return a.name.localeCompare(b.name)
            }
            return a.isFavorite ? -1 : 1
        })
    }

    return sortedGroups
}
