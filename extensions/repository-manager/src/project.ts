import fs from 'fs'
import { Icon, Image } from '@raycast/api'
import { homedir } from 'os'
import gitConfigParser from 'parse-git-config'
import gh = require('parse-github-url')
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

    constructor(cachedProject?: Project, path?: string) {
        if (cachedProject) {
            Object.assign(this, cachedProject)
            return
        }

        if (!path) {
            throw new Error('Project path is required')
        }

        this.fullPath = path
        this.displayPath = path
        if (path.startsWith(homedir())) {
            this.displayPath = path.replace(homedir(), '~')
        }
        this.pathParts = path.split('/').slice(3)
        this.name = this.pathParts.at(-1) || ''

        const color = getColorForPrimaryDirectory(this.pathParts.at(-2) || '')
        this.primaryDirectory = {
            name: this.pathParts.at(-2) || '',
            icon: { source: Icon.HardDrive, tintColor: color },
            color: color,
        }

        this.configPath = `${this.fullPath}/.raycast/project-manager.json`
        this.config = getProjectConfig(this.fullPath) || {}

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

        this.gitRemotes = parseGitRemotes(this.fullPath)
    }
}

function parseGitRemotes(fullPath: string): Repo[] {
    let repos = [] as Repo[]
    const gitConfig = gitConfigParser.sync({ cwd: fullPath, path: '.git/config', expandKeys: true })

    if (!gitConfig.remote) {
        return repos
    }

    for (const remoteName in gitConfig.remote) {
        const config = gitConfig.remote[remoteName] as Remote
        const parsed = gh(config.url)

        if (!parsed || !parsed.host || !parsed.repo) {
            continue
        }

        const icon = {
            source: {
                light: Icon.Globe as Icon | string,
                dark: Icon.Globe as Icon | string,
            },
        }

        if (parsed.host.includes('github')) {
            icon.source.light = 'github-light.png'
            icon.source.dark = 'github-dark.png'
        }

        if (parsed.host.includes('gitlab')) {
            icon.source.light = 'gitlab-light.png'
            icon.source.dark = 'gitlab-dark.png'
        }

        if (parsed.host.includes('bitbucket')) {
            icon.source.light = 'bitbucket-light.png'
            icon.source.dark = 'bitbucket-dark.png'
        }

        if (parsed.host.includes('gitness')) {
            icon.source.light = 'gitness-light.png'
            icon.source.dark = 'gitness-dark.png'
        }

        const protocol = parsed?.protocol?.replace(':', '') || 'https'
        let url = `${protocol}://${parsed.host}/${parsed.repo}`

        if (parsed.host.includes('gitness')) {
            const path = parsed?.path?.replace('git/', '')?.replace('.git', '')
            url = `${protocol}://${parsed.host}/${path}`
        }

        repos = repos.concat({
            name: remoteName,
            host: parsed.host,
            hostDisplayName: parsed.host.split('.')[0].charAt(0).toUpperCase() + parsed.host.split('.')[0].slice(1),
            url: url,
            icon: icon,
        })
    }

    return repos
}

function getProjectConfig(fullPath: string): ProjectConfig {
    let raycastConfig = {}
    if (fs.existsSync(`${fullPath}/.raycast`) && fs.existsSync(`${fullPath}/.raycast/project-manager.json`)) {
        try {
            raycastConfig = JSON.parse(fs.readFileSync(`${fullPath}/.raycast/project-manager.json`, 'utf8'))
        } catch (error) {
            return raycastConfig
        }
    }

    return raycastConfig
}

function getProjectCompiledUrls(project: Project): { [key: string]: string } {
    const compiledUrls = {} as { [key: string]: string }

    const local = getProjectUrl(project, project.config?.urls?.local || preferences.localProjectUrlTemplate || null) || ''
    if (local) {
        compiledUrls.local = local
    }

    Object.keys(project.config.urls || {}).forEach((key) => {
        const compiledUrl = getProjectUrl(project, project.config.urls?.[key] || null)

        if (compiledUrl) {
            compiledUrls[key] = compiledUrl
        }
    })

    return compiledUrls
}

export function getProjectUrl(project: Project, urlTemplate: string | null): string | null {
    if (!urlTemplate) {
        return null
    }

    let url = urlTemplate

    project.config?.dynamicUrlElements?.forEach((element) => {
        url = url.replace(`{${element.key}}`, element.value)
    })

    // if not already swapped the {project} placeholder with a dynamicUrlElement, replace it with the project name
    url = url.replace('{project}', project.name)

    // if not present a protocol, add http by default
    if (!/^(\w+):\/\//.test(url)) {
        url = `http://${url}`
    }

    return url
}

export const getDefaultProjectConfig = (project: Project): ProjectConfig => {
    return {
        name: project.name,
        description: project.description,
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
    } as ProjectConfig
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
    const sortedGroupedProjects: GroupedProjectList = { favorites: [] }

    for (const directory in groupedProjects) {
        if (Object.prototype.hasOwnProperty.call(groupedProjects, directory)) {
            const [favorites, nonFavorites] = groupedProjects[directory].reduce(
                ([fav, nonFav], project) => {
                    if (project.isFavorite) {
                        fav.push(project)
                    } else {
                        nonFav.push(project)
                    }
                    return [fav, nonFav]
                },
                [[], []] as [Project[], Project[]],
            )

            sortedGroupedProjects.favorites.push(...favorites)
            sortedGroupedProjects[directory] = nonFavorites
        }
    }

    return sortedGroupedProjects
}
