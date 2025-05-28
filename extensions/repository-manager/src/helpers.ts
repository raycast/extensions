import fs from 'fs'
import { getPreferenceValues, open, Cache, Color, Application, closeMainWindow, PopToRootType, LocalStorage } from '@raycast/api'
import { exec } from 'child_process'
import { Project, ProjectList } from './project'
import { Directory } from './components/DirectoriesDropdown'

export type PrimaryAction = 'start-development' | 'open-in-editor' | 'open-in-terminal' | 'open-url' | 'open-git-remotes'

interface Preferences {
    projectsPath: string
    primaryAction: PrimaryAction
    maxScanningLevels: number
    enableProjectsCaching: boolean
    enableProjectsGrouping: boolean
    editorApp: Application
    terminalApp: Application
    browserApp: Application
    localProjectUrlTemplate: string
    resizeEditorWindowAfterLaunch: boolean
    windowResizeMode: string
}

export const preferences = getPreferenceValues<Preferences>()

export const resizeEditorWindow = async (editorApp: Application): Promise<void> => {
    if (!preferences.resizeEditorWindowAfterLaunch) {
        return
    }

    try {
        exec(`osascript -e 'tell application "${editorApp.name}" to activate'`, (error) => {
            if (error) {
                return
            }

            setTimeout(() => {
                open('raycast://extensions/raycast/window-management/' + preferences.windowResizeMode)
            }, 1200)
        })
    } catch (error) {
        return
    }
}

const getDirectories = (path: string, depth?: number): ProjectList => {
    if (!depth) {
        depth = 0
    }

    if (depth > Number(preferences.maxScanningLevels)) {
        return []
    }

    try {
        const entries = fs.readdirSync(path, { withFileTypes: true })
        const directories = entries.filter((entry) => entry.isDirectory() && entry.name !== '.git')

        let subDirectories: ProjectList = []
        for (const directory of directories) {
            const dirPath = `${path}/${directory.name}`
            if (fs.existsSync(`${dirPath}/.git`)) {
                subDirectories.push(new Project(undefined, dirPath))
            } else {
                subDirectories = subDirectories.concat(getDirectories(dirPath, depth + 1))
            }
        }

        return subDirectories
    } catch (error) {
        return []
    }
}

export async function fetchProjects(): Promise<ProjectList> {
    if (!preferences.enableProjectsCaching) {
        return getDirectories(preferences.projectsPath)
    }

    const cache = new Cache()
    let projects: ProjectList

    if (cache.has('projects')) {
        projects = JSON.parse(cache.get('projects') as string)
        projects = projects.map((project: Project) => new Project(project))
    } else {
        projects = getDirectories(preferences.projectsPath)
        cache.remove('projects')
        cache.set('projects', JSON.stringify(projects))
    }

    const favorites = await getFavoriteProjects()

    return projects.map((project: Project) => {
        project.isFavorite = favorites.includes(project.name)
        return project
    })
}

export function fetchPrimaryDirectories(projectList: ProjectList): Directory[] {
    if (!preferences.enableProjectsCaching) {
        return getPrimaryDirectories(projectList)
    }

    const cache = new Cache()

    if (cache.has('primaryDirectories')) {
        return JSON.parse(cache.get('primaryDirectories') as string) as Directory[]
    }

    const directories = getPrimaryDirectories(projectList)
    cache.remove('primaryDirectories')
    cache.set('primaryDirectories', JSON.stringify(directories))

    return directories
}

function getPrimaryDirectories(projectList: ProjectList): Directory[] {
    return projectList.reduce((acc: Directory[], project: Project) => {
        if (!acc.some((dir: Directory) => dir.name === project.primaryDirectory.name)) {
            acc.push(project.primaryDirectory)
        }
        return acc
    }, [] as Directory[])
}

const primaryDirectoryColorIndices = new Map<string, number>()

export function getColorForPrimaryDirectory(primaryDirectory: string): Color {
    const iconColors = [Color.Purple, Color.Blue, Color.Orange, Color.Yellow, Color.Green, Color.Red, Color.Magenta]

    let colorIndex = primaryDirectoryColorIndices.get(primaryDirectory)

    if (colorIndex === undefined) {
        colorIndex = primaryDirectoryColorIndices.size % iconColors.length
        primaryDirectoryColorIndices.set(primaryDirectory, colorIndex)
    }

    return iconColors[colorIndex]
}

export function clearCache(): void {
    const cache = new Cache()
    cache.remove('projects')
    cache.remove('primaryDirectories')
    closeMainWindow({ popToRootType: PopToRootType.Immediate })
}

export function isObjectEmpty(object: object): boolean {
    return Object.keys(object).length === 0
}

export async function openUrl(url: string): Promise<void> {
    if (url.startsWith('http')) {
        await open(url, preferences.browserApp.path)
    } else {
        await open(url)
    }
}

export async function getFavoriteProjects(): Promise<string[]> {
    const favorites = await LocalStorage.getItem<string>('favorites')

    return favorites ? JSON.parse(favorites) : []
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
