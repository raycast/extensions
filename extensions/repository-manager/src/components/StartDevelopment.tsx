import { Action, Icon, open } from '@raycast/api'
import { Project, getProjectUrl } from '../project'
import { openUrl, preferences, resizeEditorWindow } from '../helpers'

type StartDevelopmentProps = {
    project: Project
}

export enum DevelopmentCommandApp {
    Editor = 'editor',
    Terminal = 'terminal',
}

type DevelopmentCommandAppConfig = {
    type: DevelopmentCommandApp
    appPath: string
    argument: string
}

function getDevelopmentCommandApps(project: Project): (DevelopmentCommandAppConfig | null)[] | undefined {
    // by default developmentCommand opens the project in the editor and in the browser (if localUrlTemplate is set in preferences or in the project config (urls.local))
    if (!project.config.developmentCommand) {
        // Check if editorApp is configured before using it
        if (preferences.editorApp && preferences.editorApp.path) {
            return [
                {
                    type: DevelopmentCommandApp.Editor,
                    appPath: preferences.editorApp.path,
                    argument: project.fullPath,
                },
            ]
        }
        return []
    }

    const appsToOpen = project.config.developmentCommand?.apps?.map((app: string) => {
        switch (app) {
            case DevelopmentCommandApp.Editor:
                // Check if editorApp is configured before using it
                if (preferences.editorApp && preferences.editorApp.path) {
                    return {
                        type: DevelopmentCommandApp.Editor,
                        appPath: preferences.editorApp.path,
                        argument: project.fullPath,
                    }
                }
                return null
            case DevelopmentCommandApp.Terminal:
                // Check if terminalApp is configured before using it
                if (preferences.terminalApp && preferences.terminalApp.path) {
                    return {
                        type: DevelopmentCommandApp.Terminal,
                        appPath: preferences.terminalApp.path,
                        argument: project.fullPath,
                    }
                }
                return null
            default:
                return null
        }
    })

    return appsToOpen?.filter((app: DevelopmentCommandAppConfig | null) => app !== null)
}

function getDevelopmentCommandUrls(project: Project): (string | null)[] | undefined {
    if (!project.config.developmentCommand) {
        return [getProjectUrl(project, project.config.urls?.local || undefined)]
    }

    return project.config.developmentCommand?.urls?.map((url: string) => {
        // if string is wrapped in curly braces, it's a reference
        if (url.match(/{.*}/)) {
            return url.replace(/{(.*)}/, (match, key) => {
                return project.config.urls?.[key.split('.')[1]] || ''
            })
        }

        return getProjectUrl(project, url)
    })
}

export default function StartDevelopment({ project }: StartDevelopmentProps) {
    return (
        <Action
            title="Start Development"
            key="start-development"
            icon={Icon.Hammer}
            onAction={() => {
                const appsToOpen = getDevelopmentCommandApps(project)
                const urlsToOpen = getDevelopmentCommandUrls(project)

                // make sure editor is the last one to be opened to properly resize the window if enabled in preferences
                appsToOpen?.sort((a, b) => {
                    if (a?.type === DevelopmentCommandApp.Editor) {
                        return 1
                    }

                    if (b?.type === DevelopmentCommandApp.Editor) {
                        return -1
                    }

                    return 0
                })

                appsToOpen?.forEach((config: DevelopmentCommandAppConfig | null) => {
                    if (!config) {
                        return
                    }

                    open(config.argument, config.appPath)

                    if (config.type === DevelopmentCommandApp.Editor && preferences.editorApp) {
                        resizeEditorWindow(preferences.editorApp)
                    }
                })

                urlsToOpen?.forEach(async (url: string | null) => {
                    if (!url) {
                        return
                    }

                    await openUrl(url)
                })
            }}
        />
    )
}
