import { Action, Icon } from '@raycast/api'
import { Project, getProjectUrl } from '../project'
import { markProjectOpened, openUrl } from '../helpers'

import { openProjectInEditor, openProjectInTerminal } from '../launch'
import { showErrorToast } from '../ui/toast'

type StartDevelopmentProps = {
    project: Project
}

export enum DevelopmentCommandApp {
    Editor = 'editor',
    Terminal = 'terminal',
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
            onAction={async () => {
                const apps = project.config.developmentCommand ? project.config.developmentCommand.apps || [] : [DevelopmentCommandApp.Editor]
                const urls = getDevelopmentCommandUrls(project) || []
                const failures: string[] = []
                let opened = false

                // Open the editor last so macOS window resizing targets the editor.
                const launches = [...(apps.includes(DevelopmentCommandApp.Terminal) ? [() => openProjectInTerminal(project.fullPath)] : []), ...urls.filter((url): url is string => Boolean(url)).map((url) => () => openUrl(url)), ...(apps.includes(DevelopmentCommandApp.Editor) ? [() => openProjectInEditor(project.fullPath)] : [])]
                for (const launch of launches) {
                    try {
                        await launch()
                        opened = true
                    } catch (error) {
                        failures.push(error instanceof Error ? error.message : String(error))
                    }
                }
                if (opened) await markProjectOpened(project)
                if (failures.length) await showErrorToast('Could not open all development apps', failures.join('; '))
            }}
        />
    )
}
