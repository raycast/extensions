import fs from 'fs/promises'
import path from 'path'
import { getPreferenceValues, open, Cache, Color, Application, closeMainWindow, PopToRootType, LocalStorage, showToast, Toast } from '@raycast/api'
import { exec } from 'child_process'
import { promisify } from 'util'

import { Project, ProjectList } from './project'
import { Directory } from './components/DirectoriesDropdown'

const execAsync = promisify(exec)

export type PrimaryAction = 'start-development' | 'open-in-editor' | 'open-in-terminal' | 'open-url' | 'open-git-remotes'

interface Preferences {
    projectsPath: string
    primaryAction: PrimaryAction
    maxScanningLevels: number
    enableProjectsCaching: boolean
    enableProjectsGrouping: boolean
    editorApp?: Application
    terminalApp?: Application
    browserApp?: Application
    localProjectUrlTemplate: string
    resizeEditorWindowAfterLaunch: boolean
    windowResizeMode: string
}

export const preferences = getPreferenceValues<Preferences>()

const WINDOW_RESIZE_DELAY = 1200
const DEFAULT_MAX_SCANNING_LEVELS = 3

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

const getDirectories = async (searchPath: string, depth = 0): Promise<ProjectList> => {
    const maxDepth = Number(preferences.maxScanningLevels) || DEFAULT_MAX_SCANNING_LEVELS

    if (depth > maxDepth) {
        return []
    }

    try {
        const entries = await fs.readdir(searchPath, { withFileTypes: true })
        const directories = entries.filter((entry) => entry.isDirectory() && entry.name !== '.git')

        const promises = directories.map(async (directory) => {
            const dirPath = path.join(searchPath, directory.name)

            if (await isGitRepository(dirPath)) {
                return [new Project(undefined, dirPath)]
            } else {
                return await getDirectories(dirPath, depth + 1)
            }
        })

        const results = await Promise.all(promises)
        return results.flat()
    } catch (error) {
        console.error(`Failed to read directory ${searchPath}:`, error)
        await showToast({
            style: Toast.Style.Failure,
            title: 'Directory Access Error',
            message: `Failed to read directory: ${searchPath}`,
        })
        return []
    }
}

export async function fetchProjects(): Promise<ProjectList> {
    try {
        const favorites = await getFavoriteProjects()

        if (!preferences.enableProjectsCaching || process.env.NODE_ENV === 'development') {
            const projects = await getDirectories(preferences.projectsPath)
            return projects.map((project: Project) => {
                project.isFavorite = favorites.includes(project.name)
                return project
            })
        }

        const cache = new Cache()
        let projects: ProjectList

        if (cache.has('projects')) {
            try {
                const cachedData = cache.get('projects') as string
                const cachedProjects = JSON.parse(cachedData)
                projects = cachedProjects.map((project: Project) => new Project(project))
            } catch (error) {
                console.error('Failed to parse cached projects:', error)
                // If cache is corrupted, fetch fresh data
                projects = await getDirectories(preferences.projectsPath)
                cache.set('projects', JSON.stringify(projects))
            }
        } else {
            projects = await getDirectories(preferences.projectsPath)
            cache.set('projects', JSON.stringify(projects))
        }

        return projects.map((project: Project) => {
            project.isFavorite = favorites.includes(project.name)
            return project
        })
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

export function fetchPrimaryDirectories(projectList: ProjectList): Directory[] {
    if (!preferences.enableProjectsCaching || process.env.NODE_ENV === 'development') {
        return getPrimaryDirectories(projectList)
    }

    const cache = new Cache()

    if (cache.has('primaryDirectories')) {
        try {
            const cachedData = cache.get('primaryDirectories') as string
            return JSON.parse(cachedData) as Directory[]
        } catch (error) {
            console.error('Failed to parse cached directories:', error)
            // Fall back to generating fresh data
        }
    }

    const directories = getPrimaryDirectories(projectList)
    cache.set('primaryDirectories', JSON.stringify(directories))

    return directories
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

export function clearCache(): void {
    const cache = new Cache()
    cache.remove('projects')
    cache.remove('primaryDirectories')
    assignedColors.clear()
    closeMainWindow({ popToRootType: PopToRootType.Immediate })
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
        const favorites = await LocalStorage.getItem<string>('favorites')
        return favorites ? JSON.parse(favorites) : []
    } catch (error) {
        console.error('Failed to get favorite projects:', error)
        return []
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
