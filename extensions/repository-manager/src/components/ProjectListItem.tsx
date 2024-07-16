import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import { Project } from '../project'
import StartDevelopment from './StartDevelopment'
import { OpenInEditor, OpenInTerminal, OpenUrl } from './Open'
import OpenGitRemotes from './OpenGitRemotes'
import ProjectDetail from './ProjectDetail'
import Git from './Git'
import Config from './Config'
import { Copy } from './Copy'
import Cache from './Cache'
import { Directory } from './DirectoriesDropdown'

type ProjectListItemProps = {
    project: Project
    directories: Directory[]
}

export default function ProjectListItem({ project, directories }: ProjectListItemProps) {
    return (
        <List.Item
            key={project.name}
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.description || ''}
            data-directory={project.primaryDirectory.name}
            accessories={[
                { text: project.displayPath, tooltip: 'Full Path' },
                { tag: { value: project.primaryDirectory.name, color: directories.find((conf) => conf.name === project.primaryDirectory.name)?.icon?.tintColor || Color.Orange }, tooltip: 'Main Directory' },
            ]}
            actions={
                <ActionPanel>
                    <ActionPanel.Section title="Open project">
                        <StartDevelopment project={project} />
                        <OpenInEditor project={project} />
                        <OpenInTerminal project={project} />
                        <OpenUrl project={project} />
                        <OpenGitRemotes project={project} />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Actions">
                        <Config project={project} />
                        <Copy project={project} />
                        <Action.Push
                            title="Details"
                            icon={Icon.Info}
                            shortcut={{ modifiers: ['cmd'], key: 'i' }}
                            target={<ProjectDetail project={project} />}
                        />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Extra Actions">
                        <Git project={project} />
                        <Action.ShowInFinder
                            title="Show in Finder"
                            path={project.fullPath}
                            shortcut={{ modifiers: ['cmd'], key: 'f' }}
                        />
                        <Action.OpenWith
                            title="Open With"
                            path={project.fullPath}
                            shortcut={{ modifiers: ['cmd', 'opt'], key: 'o' }}
                        />
                        <Cache />
                    </ActionPanel.Section>
                </ActionPanel>
            }
        />
    )
}
