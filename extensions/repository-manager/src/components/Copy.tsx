import { Action, ActionPanel, Icon } from '@raycast/api'
import { Project } from '../project'

type CopyProps = {
    project: Project
}

export function Copy({ project }: CopyProps) {
    return (
        <ActionPanel.Submenu
            title="Copy Info"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ['cmd'], key: '.' }}
        >
            <Action.CopyToClipboard
                title="Copy Name"
                content={project.name}
            />
            <Action.CopyToClipboard
                title="Copy Path"
                content={project.displayPath}
            />
            {project.config.urls &&
                Object.entries(project.config.urls).map(([key, value], i) => {
                    if (!value) {
                        return null
                    }

                    return (
                        <Action.CopyToClipboard
                            key={key + i}
                            title={`Copy ${key} URL`}
                            content={value}
                        />
                    )
                })}
        </ActionPanel.Submenu>
    )
}
