import { Action, ActionPanel, Form, Icon, useNavigation } from '@raycast/api'
import { Project } from '../project'
import { normalizeProjectTags, setProjectTags } from '../helpers'
import { showSuccessToast } from '../ui/toast'

type ManageProjectTagsProps = {
    project: Project
    availableTags: string[]
    onTagsChange: () => void
}

type ProjectTagsFormValues = {
    tags: string[]
    newTags: string
}

function getTagOptions(availableTags: string[], selectedTags: string[]): string[] {
    return normalizeProjectTags([...availableTags, ...selectedTags])
}

function parseNewTags(value: string): string[] {
    return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
}

function ProjectTagsForm({ project, availableTags, onTagsChange }: ManageProjectTagsProps) {
    const { pop } = useNavigation()
    const tagOptions = getTagOptions(availableTags, project.tags)

    async function handleSubmit(values: ProjectTagsFormValues) {
        const nextTags = normalizeProjectTags([...(values.tags || []), ...parseNewTags(values.newTags || '')])

        await setProjectTags(project, nextTags)
        onTagsChange()
        pop()
        await showSuccessToast('Tags updated', nextTags.length > 0 ? nextTags.join(', ') : 'No tags assigned')
    }

    return (
        <Form
            navigationTitle={`${project.name} Tags`}
            actions={
                <ActionPanel>
                    <Action.SubmitForm
                        title="Save Tags"
                        icon={Icon.CheckCircle}
                        onSubmit={handleSubmit}
                    />
                </ActionPanel>
            }
        >
            <Form.TagPicker
                id="tags"
                title="Tags"
                defaultValue={project.tags}
            >
                {tagOptions.map((tag) => (
                    <Form.TagPicker.Item
                        key={tag}
                        value={tag}
                        title={tag}
                        icon={Icon.Tag}
                    />
                ))}
            </Form.TagPicker>
            <Form.TextField
                id="newTags"
                title="New Tags"
                placeholder="client, internal, oss"
            />
        </Form>
    )
}

export function ManageProjectTags(props: ManageProjectTagsProps) {
    return (
        <Action.Push
            title="Manage Tags"
            icon={Icon.Tag}
            target={<ProjectTagsForm {...props} />}
        />
    )
}
