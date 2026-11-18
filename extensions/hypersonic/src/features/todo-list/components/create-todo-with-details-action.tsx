import { Action, Icon, Form, ActionPanel, useNavigation } from '@raycast/api'
import { useState } from 'react'
import { Todo } from '@/types/todo'
import { Status } from '@/types/status'
import { Tag } from '@/types/tag'
import { User } from '@/types/user'
import { Project } from '@/types/project'
import { toISOStringWithTimezone } from '../utils/to-iso-string-with-time-zone'
import {
  countNoteBlocks,
  MAX_NOTE_BLOCKS,
  MAX_NOTE_LENGTH,
} from '@/services/notion/utils/build-note-blocks'

type CreateTodoWithDetailsProps = {
  todo: Todo
  statuses: Status[]
  users: User[]
  tags: Tag[]
  projects: Project[]
  hasStatusProperty: boolean
  hasTagProperty: boolean
  hasAssigneeProperty: boolean
  hasProjectProperty: boolean
  hasUrlProperty: boolean
  onCreate: (overrides: Partial<Todo>) => Promise<boolean>
}

function CreateTodoWithDetailsForm({
  todo,
  statuses,
  users,
  tags,
  projects,
  hasStatusProperty,
  hasTagProperty,
  hasAssigneeProperty,
  hasProjectProperty,
  hasUrlProperty,
  onCreate,
}: CreateTodoWithDetailsProps) {
  const [title, setTitle] = useState(todo.title)
  const [note, setNote] = useState('')
  const [statusId, setStatusId] = useState(todo.status?.id ?? '')
  const [date, setDate] = useState<Date | null>(todo.date ?? null)
  const [userId, setUserId] = useState(todo.user?.id ?? '')
  const [tagId, setTagId] = useState(todo.tag?.id ?? '')
  const [projectId, setProjectId] = useState(todo.projectId ?? '')
  const [url, setUrl] = useState(todo.contentUrl ?? '')
  const [noteError, setNoteError] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { pop } = useNavigation()

  async function handleSubmit() {
    if (note.length > MAX_NOTE_LENGTH) {
      setNoteError(`Note must be ${MAX_NOTE_LENGTH} characters or fewer`)
      return
    }
    const blockCount = countNoteBlocks(note)
    if (blockCount > MAX_NOTE_BLOCKS) {
      setNoteError(`Note must be ${MAX_NOTE_BLOCKS} lines or fewer`)
      return
    }
    setIsSubmitting(true)
    try {
      const overrides: Partial<Todo> = {
        title: title.trim() || todo.title,
        note,
        date: date ?? null,
        dateValue: date ? toISOStringWithTimezone(date) : null,
      }
      if (hasStatusProperty) {
        overrides.status = statusId
          ? statuses.find((s) => s.id === statusId) ?? null
          : null
      }
      if (hasAssigneeProperty) {
        overrides.user = userId
          ? users.find((u) => u.id === userId) ?? null
          : null
      }
      if (hasTagProperty) {
        overrides.tag = tagId ? tags.find((t) => t.id === tagId) ?? null : null
      }
      if (hasProjectProperty) {
        overrides.projectId = projectId || null
      }
      if (hasUrlProperty) {
        overrides.contentUrl = url.trim() || null
      }
      const created = await onCreate(overrides)
      if (created) {
        pop()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        info="The task name"
        value={title}
        onChange={setTitle}
      />
      {hasStatusProperty ? (
        <Form.Dropdown
          id="status"
          title="Status"
          info="Sets the task status"
          value={statusId}
          onChange={setStatusId}
        >
          <Form.Dropdown.Item value="" title="None" />
          {statuses.map((status) => (
            <Form.Dropdown.Item
              key={status.id}
              value={status.id}
              title={status.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      <Form.DatePicker
        id="date"
        title="Date"
        info="Sets the task due date"
        value={date}
        onChange={setDate}
      />
      {hasAssigneeProperty ? (
        <Form.Dropdown
          id="assignee"
          title="Assignee"
          info="Assigns the task to a person"
          value={userId}
          onChange={setUserId}
        >
          <Form.Dropdown.Item value="" title="Unassigned" />
          {users.map((user) => (
            <Form.Dropdown.Item
              key={user.id}
              value={user.id}
              title={user.name}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      {hasTagProperty ? (
        <Form.Dropdown
          id="tag"
          title="Label"
          info="Adds a label to the task"
          value={tagId}
          onChange={setTagId}
        >
          <Form.Dropdown.Item value="" title="None" />
          {tags.map((tag) => (
            <Form.Dropdown.Item key={tag.id} value={tag.id} title={tag.name} />
          ))}
        </Form.Dropdown>
      ) : null}
      {hasProjectProperty ? (
        <Form.Dropdown
          id="project"
          title="Project"
          info="Links the task to a project"
          value={projectId}
          onChange={setProjectId}
        >
          <Form.Dropdown.Item value="" title="None" />
          {projects.map((project) => (
            <Form.Dropdown.Item
              key={project.id}
              value={project.id}
              title={project.title}
            />
          ))}
        </Form.Dropdown>
      ) : null}
      {hasUrlProperty ? (
        <Form.TextField
          id="url"
          title="URL"
          info="Attaches a URL to the task"
          placeholder="https://..."
          value={url}
          onChange={setUrl}
        />
      ) : null}
      <Form.TextArea
        id="note"
        title="Note"
        info="Saved to the body of the new Notion page. Each line becomes its own block, and a line that is only a URL becomes a bookmark."
        placeholder="Add a note, links, or details"
        value={note}
        error={noteError}
        onChange={(value) => {
          if (noteError) {
            setNoteError(undefined)
          }
          setNote(value)
        }}
      />
    </Form>
  )
}

export function CreateTodoWithDetailsAction(props: CreateTodoWithDetailsProps) {
  return (
    <Action.Push
      icon={Icon.Paragraph}
      title="Create Task with Details..."
      target={<CreateTodoWithDetailsForm {...props} />}
      shortcut={{ modifiers: ['cmd', 'shift'], key: 'return' }}
    />
  )
}
