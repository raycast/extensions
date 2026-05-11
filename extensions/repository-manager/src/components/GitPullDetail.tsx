import { Action, ActionPanel, Detail, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { useExec } from '@raycast/utils'
import { OpenInEditor, OpenInTerminal } from './Open'
import OpenGitRemotes from './OpenGitRemotes'

type GitPullDetailProps = {
    project: Project
}

export default function GitPullDetail({ project }: GitPullDetailProps) {
    const { pop } = useNavigation()
    const { isLoading, data: changes } = useExec('git', ['pull'], { cwd: project.fullPath })

    const markdown = `
# ${project.name}

## Git Pull
${isLoading ? 'Pulling latest changes...' : ''}

\`\`\`bash
${changes ? changes : '...'}
\`\`\`
`

    return (
        <Detail
            isLoading={isLoading}
            markdown={markdown}
            actions={
                <ActionPanel>
                    <Action
                        title="Close"
                        icon={Icon.XMarkCircle}
                        onAction={() => pop()}
                    />
                    <OpenInEditor project={project} />
                    <OpenInTerminal project={project} />
                    <OpenGitRemotes project={project} />
                </ActionPanel>
            }
        />
    )
}
