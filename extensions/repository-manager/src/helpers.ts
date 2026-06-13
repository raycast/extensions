import fs from 'fs/promises'
import path from 'path'
import { getPreferenceValues, open, Cache, Color, Application, closeMainWindow, PopToRootType, LocalStorage, showToast, Toast } from '@raycast/api'
import { exec, execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'

import { GitHealth, Project, ProjectList } from './project'
import { Directory } from './components/DirectoriesDropdown'

const execAsync = promisify(exec)
const execFileAsync = promisify(execFile)

export type PrimaryAction = 'start-development' | 'open-in-editor' | 'open-in-terminal' | 'open-url' | 'open-git-remotes'

export const preferences = getPreferenceValues<ExtensionPreferences>()

const WINDOW_RESIZE_DELAY = 1200
const DEFAULT_MAX_SCANNING_LEVELS = 3
const RECENT_PROJECTS_LIMIT = 20
const GIT_HEALTH_CONCURRENCY = 4
const PROJECT_SCAN_CONCURRENCY = 8
const PROJECTS_CACHE_KEY = 'projects'
const PROJECTS_CACHE_VERSION = 2
const FAVORITES_STORAGE_KEY = 'favorites'
const PROJECT_TAGS_STORAGE_KEY = 'projectTags'
const IGNORED_DIRECTORY_NAMES = new Set(['.cache', '.next', '.nuxt', '.output', '.turbo', '.vercel', 'bower_components', 'coverage', 'node_modules'])

type ProjectsCachePayload = {
    version: number
    projectsPath: string
    maxScanningLevels: number
    projects: ProjectList
}

export type ProjectTagsByPath = Record<string, string[]>

function isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError'
}

function runGit(projectPath: string, args: string[], signal?: AbortSignal) {
    return execFileAsync('git', args, { cwd: projectPath, signal })
}

export function resolveUserPath(filePath: string): string {
    return filePath.replace(/^~(?=$|\/)/, homedir())
}

function getNormalizedMaxScanningLevels(): number {
    return Number(preferences.maxScanningLevels) || DEFAULT_MAX_SCANNING_LEVELS
}

function isProjectsCachePayload(value: unknown): value is ProjectsCachePayload {
    if (!value || typeof value !== 'object') {
        return false
    }

    const payload = value as Partial<ProjectsCachePayload>
    return payload.version === PROJECTS_CACHE_VERSION && payload.projectsPath === preferences.projectsPath && payload.maxScanningLevels === getNormalizedMaxScanningLevels() && Array.isArray(payload.projects)
}

function createProjectsCachePayload(projects: ProjectList): ProjectsCachePayload {
    return {
        version: PROJECTS_CACHE_VERSION,
        projectsPath: preferences.projectsPath,
        maxScanningLevels: getNormalizedMaxScanningLevels(),
        projects,
    }
}

export const resizeEditorWindow = async (editorApp: Application): Promise<void> => {
    if (!preferences.resizeEditorWindowAfterLaunch || !editorApp?.name) {
        return
    }

    try {
        await execAsync(`osascript -e 'tell application "${editorApp.name}" to activate'`)

        setTimeout(() => {
            open(`raycast://extensions/raycast/window-management/${preferences.windowResizeMode}`).catch(() => {
                // Silently fail if window management extension is not available
            })
        }, WINDOW_RESIZE_DELAY)
    } catch (error) {
        console.error('Failed to resize editor window:', error)
        // Don't show error to user as this is a nice-to-have feature
    }
}

const isGitRepository = async (dirPath: string): Promise<boolean> => {
    try {
        const gitPath = path.join(dirPath, '.git')
        const stat = await fs.stat(gitPath)
        return stat.isDirectory()
    } catch {
        return false
    }
}

async function directoryExists(dirPath: string): Promise<boolean> {
    try {
        const stat = await fs.stat(dirPath)
        return stat.isDirectory()
    } catch {
        return false
    }
}

const getDirectories = async (searchPath: string): Promise<ProjectList> => {
    const maxDepth = getNormalizedMaxScanningLevels()
    const resolvedSearchPath = resolveUserPath(searchPath)
    const projects: ProjectList = []
    const queue = [{ dirPath: resolvedSearchPath, depth: 0 }]

    const scanNextDirectory = async () => {
        while (queue.length > 0) {
            const current = queue.shift()

            if (!current || current.depth > maxDepth) {
                continue
            }

            try {
                const entries = await fs.readdir(current.dirPath, { withFileTypes: true })

                for (const entry of entries) {
                    if (!entry.isDirectory() || entry.name === '.git' || IGNORED_DIRECTORY_NAMES.has(entry.name)) {
                        continue
                    }

                    const dirPath = path.join(current.dirPath, entry.name)

                    if (await isGitRepository(dirPath)) {
                        projects.push(new Project(undefined, dirPath))
                    } else if (current.depth < maxDepth) {
                        queue.push({ dirPath, depth: current.depth + 1 })
                    }
                }
            } catch (error) {
                console.error(`Failed to read directory ${current.dirPath}:`, error)
            }
        }
    }

    if (!(await directoryExists(resolvedSearchPath))) {
        await showToast({
            style: Toast.Style.Failure,
            title: 'Directory Access Error',
            message: `Failed to read directory: ${resolvedSearchPath}`,
        })
        return []
    }

    const workers = Array.from({ length: PROJECT_SCAN_CONCURRENCY }, scanNextDirectory)
    await Promise.all(workers)

    return projects
}

export async function fetchProjects(): Promise<ProjectList> {
    try {
        const favorites = await getFavoriteProjects()
        const recentProjects = await getRecentProjects()
        const projectTagsByPath = await getProjectTagsByPath()

        if (!preferences.enableProjectsCaching || process.env.NODE_ENV === 'development') {
            const projects = await getDirectories(preferences.projectsPath)
            return await enrichProjects(projects, favorites, recentProjects, projectTagsByPath)
        }

        const cache = new Cache()
        let projects: ProjectList
        let shouldUpdateCache = false

        if (cache.has(PROJECTS_CACHE_KEY)) {
            try {
                const cachedData = cache.get(PROJECTS_CACHE_KEY) as string
                const cachedPayload = JSON.parse(cachedData)

                if (isProjectsCachePayload(cachedPayload)) {
                    projects = cachedPayload.projects.map((project: Project) => new Project(project))
                    const existingProjects = await filterExistingProjects(projects)
                    shouldUpdateCache = existingProjects.length !== projects.length
                    projects = existingProjects
                } else {
                    projects = await getDirectories(preferences.projectsPath)
                    shouldUpdateCache = true
                }
            } catch (error) {
                console.error('Failed to parse cached projects:', error)
                // If cache is corrupted, fetch fresh data
                projects = await getDirectories(preferences.projectsPath)
                shouldUpdateCache = true
            }
        } else {
            projects = await getDirectories(preferences.projectsPath)
            shouldUpdateCache = true
        }

        if (shouldUpdateCache) {
            cache.set(PROJECTS_CACHE_KEY, JSON.stringify(createProjectsCachePayload(projects)))
        }

        return await enrichProjects(projects, favorites, recentProjects, projectTagsByPath)
    } catch (error) {
        console.error('Failed to fetch projects:', error)
        await showToast({
            style: Toast.Style.Failure,
            title: 'Project Fetch Error',
            message: 'Failed to load projects. Please check your projects path in preferences.',
        })
        return []
    }
}

async function filterExistingProjects(projects: ProjectList): Promise<ProjectList> {
    const existence = await Promise.all(projects.map((project) => directoryExists(project.fullPath)))
    return projects.filter((_, index) => existence[index])
}

async function enrichProjects(projects: ProjectList, favorites: string[], recentProjects: RecentProject[], projectTagsByPath: ProjectTagsByPath): Promise<ProjectList> {
    const favoriteSet = new Set(favorites)
    const migratedFavoritePaths = new Set<string>()
    const migratedLegacyNames = new Set<string>()
    const recentByPath = new Map(recentProjects.map((project) => [project.fullPath, project.lastOpenedAt]))

    const enrichedProjects = projects.map((project: Project) => {
        const isPathFavorite = favoriteSet.has(project.fullPath)
        const isLegacyFavorite = favoriteSet.has(project.name)

        if (isLegacyFavorite) {
            migratedFavoritePaths.add(project.fullPath)
            migratedLegacyNames.add(project.name)
        }

        project.isFavorite = isPathFavorite || isLegacyFavorite
        project.lastOpenedAt = recentByPath.get(project.fullPath) || null
        project.gitHealth = null
        project.tags = normalizeProjectTags(projectTagsByPath[project.fullPath] || [])
        return project
    })

    if (migratedFavoritePaths.size > 0) {
        await setFavoriteProjects([...favorites.filter((favorite) => !migratedLegacyNames.has(favorite)), ...migratedFavoritePaths])
    }

    return enrichedProjects
}

export async function fetchGitHealthForProjects(projects: ProjectList, onProjectGitHealth?: (fullPath: string, gitHealth: GitHealth | null) => void, signal?: AbortSignal): Promise<Record<string, GitHealth | null>> {
    const healthByPath: Record<string, GitHealth | null> = {}
    const queue = [...projects]

    const workers = Array.from({ length: Math.min(GIT_HEALTH_CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0 && !signal?.aborted) {
            const project = queue.shift()

            if (!project) {
                return
            }

            const gitHealth = await getProjectGitHealth(project.fullPath, signal)

            if (signal?.aborted) {
                return
            }

            healthByPath[project.fullPath] = gitHealth
            onProjectGitHealth?.(project.fullPath, gitHealth)
        }
    })

    await Promise.all(workers)

    return healthByPath
}

async function getProjectGitHealth(projectPath: string, signal?: AbortSignal): Promise<GitHealth | null> {
    try {
        const { stdout: status } = await runGit(projectPath, ['status', '--porcelain=v2', '--branch', '--untracked-files=no'], signal)
        const hasUntrackedFiles = await hasUntrackedChanges(projectPath, signal)
        const statusLines = status.split('\n').filter(Boolean)
        const changeLines = statusLines.filter((line) => !line.startsWith('#') && !line.startsWith('!'))
        const trackedChangeLines = changeLines.filter((line) => line.startsWith('1 ') || line.startsWith('2 ') || line.startsWith('u '))
        const stagedFiles = trackedChangeLines.filter((line) => {
            const statusCode = line.split(' ')[1] || '..'
            return statusCode[0] !== '.'
        }).length
        const unstagedFiles = trackedChangeLines.filter((line) => {
            const statusCode = line.split(' ')[1] || '..'
            return statusCode[1] !== '.'
        }).length
        const untrackedFiles = hasUntrackedFiles ? null : 0
        const branch =
            statusLines
                .find((line) => line.startsWith('# branch.head '))
                ?.replace('# branch.head ', '')
                .trim() || null
        const upstream =
            statusLines
                .find((line) => line.startsWith('# branch.upstream '))
                ?.replace('# branch.upstream ', '')
                .trim() || null
        const aheadBehindLine = statusLines.find((line) => line.startsWith('# branch.ab '))
        let ahead = 0
        let behind = 0

        if (aheadBehindLine) {
            const aheadMatch = aheadBehindLine.match(/\+(\d+)/)
            const behindMatch = aheadBehindLine.match(/-(\d+)/)
            ahead = Number(aheadMatch?.[1]) || 0
            behind = Number(behindMatch?.[1]) || 0
        }

        return {
            branch: branch === '(detached)' ? null : branch,
            upstream,
            isDirty: changeLines.length > 0 || hasUntrackedFiles,
            ahead,
            behind,
            changedFiles: changeLines.length + (hasUntrackedFiles ? 1 : 0),
            stagedFiles,
            unstagedFiles,
            untrackedFiles,
            hasUpstream: Boolean(upstream),
        }
    } catch (error) {
        if (signal?.aborted || isAbortError(error)) {
            throw error
        }

        console.error(`Failed to read git health for ${projectPath}:`, error)
        return null
    }
}

async function hasUntrackedChanges(projectPath: string, signal?: AbortSignal): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const git = spawn('git', ['ls-files', '--others', '--exclude-standard', '--directory'], {
            cwd: projectPath,
            signal,
            stdio: ['ignore', 'pipe', 'ignore'],
        })

        let settled = false

        const finish = (hasUntrackedFiles: boolean) => {
            if (settled) {
                return
            }

            settled = true
            git.kill()
            resolve(hasUntrackedFiles)
        }

        git.stdout.on('data', () => finish(true))
        git.on('error', (error) => {
            if (signal?.aborted || isAbortError(error)) {
                reject(error)
                return
            }

            resolve(false)
        })
        git.on('close', () => finish(false))
    })
}

export function fetchPrimaryDirectories(projectList: ProjectList): Directory[] {
    return getPrimaryDirectories(projectList)
}

function getPrimaryDirectories(projectList: ProjectList): Directory[] {
    const directoryMap = new Map<string, Directory>()

    for (const project of projectList) {
        const dirName = project.primaryDirectory.name
        if (!directoryMap.has(dirName)) {
            directoryMap.set(dirName, project.primaryDirectory)
        }
    }

    return Array.from(directoryMap.values())
}

const assignedColors = new Map<string, Color>()

export function getColorForPrimaryDirectory(primaryDirectory: string): Color {
    // Check if we already have a cached color for this directory
    if (assignedColors.has(primaryDirectory)) {
        return assignedColors.get(primaryDirectory) as Color
    }

    const iconColors = [Color.Purple, Color.Blue, Color.Orange, Color.Yellow, Color.Green, Color.Red, Color.Magenta]

    // Use a deterministic hash-based approach for consistent color assignment
    let hash = 0
    for (let i = 0; i < primaryDirectory.length; i++) {
        const char = primaryDirectory.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash |= 0 // Convert to 32bit integer
    }

    // Ensure we get a positive index
    const colorIndex = Math.abs(hash) % iconColors.length
    const color = iconColors[colorIndex]

    // Cache the result for performance
    assignedColors.set(primaryDirectory, color)
    return color
}

export function clearCache(closeWindow = true): void {
    const cache = new Cache()
    cache.remove(PROJECTS_CACHE_KEY)
    cache.remove('primaryDirectories')
    assignedColors.clear()
    if (closeWindow) {
        closeMainWindow({ popToRootType: PopToRootType.Immediate })
    }
}

export function isObjectEmpty(object: object): boolean {
    return Object.keys(object).length === 0
}

export async function openUrl(url: string): Promise<void> {
    try {
        if (url.startsWith('http')) {
            if (preferences.browserApp?.path) {
                await open(url, preferences.browserApp.path)
            } else {
                await open(url)
            }
        } else {
            await open(url)
        }
    } catch (error) {
        console.error('Failed to open URL:', error)
        await showToast({
            style: Toast.Style.Failure,
            title: 'Failed to Open URL',
            message: `Could not open: ${url}`,
        })
    }
}

export async function getFavoriteProjects(): Promise<string[]> {
    try {
        const favorites = await LocalStorage.getItem<string>(FAVORITES_STORAGE_KEY)
        const parsedFavorites = favorites ? JSON.parse(favorites) : []
        return Array.isArray(parsedFavorites) ? parsedFavorites.filter((favorite): favorite is string => typeof favorite === 'string') : []
    } catch (error) {
        console.error('Failed to get favorite projects:', error)
        return []
    }
}

export async function setFavoriteProjects(favorites: string[]): Promise<void> {
    const uniqueFavorites = [...new Set(favorites)]
    await LocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(uniqueFavorites))
}

export function normalizeProjectTags(tags: string[]): string[] {
    return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export async function getProjectTagsByPath(): Promise<ProjectTagsByPath> {
    try {
        const projectTags = await LocalStorage.getItem<string>(PROJECT_TAGS_STORAGE_KEY)
        const parsedProjectTags = projectTags ? JSON.parse(projectTags) : {}

        if (!parsedProjectTags || typeof parsedProjectTags !== 'object' || Array.isArray(parsedProjectTags)) {
            return {}
        }

        return Object.entries(parsedProjectTags).reduce<ProjectTagsByPath>((normalizedProjectTags, [projectPath, tags]) => {
            if (Array.isArray(tags)) {
                normalizedProjectTags[projectPath] = normalizeProjectTags(tags.filter((tag): tag is string => typeof tag === 'string'))
            }

            return normalizedProjectTags
        }, {})
    } catch (error) {
        console.error('Failed to get project tags:', error)
        return {}
    }
}

export async function setProjectTagsByPath(projectTagsByPath: ProjectTagsByPath): Promise<void> {
    const normalizedProjectTags = Object.entries(projectTagsByPath).reduce<ProjectTagsByPath>((normalized, [projectPath, tags]) => {
        const normalizedTags = normalizeProjectTags(tags)

        if (normalizedTags.length > 0) {
            normalized[projectPath] = normalizedTags
        }

        return normalized
    }, {})

    await LocalStorage.setItem(PROJECT_TAGS_STORAGE_KEY, JSON.stringify(normalizedProjectTags))
}

export async function setProjectTags(project: Project, tags: string[]): Promise<void> {
    const projectTagsByPath = await getProjectTagsByPath()
    const normalizedTags = normalizeProjectTags(tags)

    if (normalizedTags.length > 0) {
        projectTagsByPath[project.fullPath] = normalizedTags
    } else {
        delete projectTagsByPath[project.fullPath]
    }

    await setProjectTagsByPath(projectTagsByPath)
}

export function getAllProjectTags(projects: ProjectList): string[] {
    return normalizeProjectTags(projects.flatMap((project) => project.tags || []))
}

type RecentProject = {
    fullPath: string
    lastOpenedAt: string
}

export async function getRecentProjects(): Promise<RecentProject[]> {
    try {
        const recentProjects = await LocalStorage.getItem<string>('recentProjects')
        return recentProjects ? JSON.parse(recentProjects) : []
    } catch (error) {
        console.error('Failed to get recent projects:', error)
        return []
    }
}

export async function markProjectOpened(project: Project): Promise<void> {
    try {
        const recentProjects = await getRecentProjects()
        const nextRecentProjects = [{ fullPath: project.fullPath, lastOpenedAt: new Date().toISOString() }, ...recentProjects.filter((recentProject) => recentProject.fullPath !== project.fullPath)].slice(0, RECENT_PROJECTS_LIMIT)

        await LocalStorage.setItem('recentProjects', JSON.stringify(nextRecentProjects))
    } catch (error) {
        console.error('Failed to update recent projects:', error)
    }
}

// export async function addProjectToFavorites(project: Project): Promise<void> {
//     const favorites = await getFavoriteProjects();

//     if (favorites) {
//         const newFavorites = [...favorites, project.name]
//             .filter((value, index, self) => self.indexOf(value) === index);
//         await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
//     } else {
//         await LocalStorage.setItem("favorites", JSON.stringify([project.name]));
//     }
// }
