import { Action, ActionPanel, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import GitPullDetail from './GitPullDetail'
import GitStatusDetail from './GitStatusDetail'

type GitProps = {
    project: Project
}

export default function Git({ project }: GitProps) {
    const { push } = useNavigation()

    return (
        <ActionPanel.Submenu
            title="Git"
            icon={Icon.WrenchScrewdriver}
            shortcut={{ modifiers: ['cmd'], key: 'g' }}
        >
            <Action
                title="Git Status"
                icon={Icon.Code}
                onAction={() => push(<GitStatusDetail project={project} />)}
            />
            <Action
                title="Git Pull"
                icon={Icon.Download}
                onAction={() => push(<GitPullDetail project={project} />)}
            />
        </ActionPanel.Submenu>
    )
}
