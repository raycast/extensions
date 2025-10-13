import { ActionPanel, Form, showToast, Icon, Action, Toast, LaunchProps, Color, AI } from '@raycast/api';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';

import { addProject, getAreas, getTags } from './api';
import ErrorView from './components/ErrorView';
import { listItems } from './helpers';
import { getDateString } from './utils';

type FormValues = {
  title: string;
  notes: string;
  tags: string[];
  areaId: string;
  // Possible values for when: 'today' | 'evening' | 'upcoming' | 'tomorrow' | 'anytime' | 'someday' | 'logbook' | 'trash';
  when: string;
  date: Date | null;
  toDos: string;
  deadline: Date | null;
};

type AddNewProjectProps = {
  draftValues?: LaunchProps['draftValues'];
};

export function AddNewProject({ draftValues }: AddNewProjectProps) {
  const { data: tags, isLoading: isLoadingTags, error: tagsError } = useCachedPromise(() => getTags());
  const { data: areas, isLoading: isLoadingAreas, error: areasError } = useCachedPromise(() => getAreas());

  const { handleSubmit, itemProps, values, reset, focus, setValue } = useForm<FormValues>({
    async onSubmit(values) {
      const json = {
        title: values.title,
        notes: values.notes,
        when: values.when === 'upcoming' && values.date ? getDateString(values.date) : values.when,
        'area-id': values.areaId,
        deadline: values.deadline ? getDateString(values.deadline) : '',
        ...(values.tags.length > 0 && { tags: values.tags.join(',') }),
        'to-dos': values.toDos,
      };

      await addProject(json);

      showToast({ style: Toast.Style.Success, title: 'Added new project', message: values.title });
      reset({ title: '', notes: '', tags: [], when: '', areaId: '', toDos: '', deadline: null });
      focus('title');
    },
    initialValues: {
      title: draftValues?.title ?? '',
      notes: draftValues?.notes ?? '',
      tags: draftValues?.tags ?? [],
      when: draftValues?.when ?? null,
      toDos: draftValues?.toDos ?? '',
      deadline: draftValues?.deadline ?? null,
    },
    validation: { title: FormValidation.Required },
  });

  async function generateToDos() {
    try {
      if (!values.title) {
        await showToast({ style: Toast.Style.Failure, title: 'The project should have a title' });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Generating to-dos' });
      const items =
        await AI.ask(`Break down a project into tasks. The tasks should be actionable. Each item should be separated by a new line. Return the tasks in the same language than the projects's title (e.g if the project title is written in French, the tasks should be written in French as well).

For example, for a project named "Vacation in Rome", you could write:
Research hotels in Rome and book one
Book flights
Find the best activities to do in Rome
...

Note that each task doesn't start with a hyphen or a number. This is important.
Here's the project you need to break-down: "${values.title}"
${values.notes.length > 0 ? `For additional context, here are the task's notes: "${values.notes}"` : ''}

Tasks:`);
      toast.hide();
      setValue('toDos', items.trim());
      focus('toDos');
    } catch (error) {
      const errorMessage = typeof error === 'string' ? error : error instanceof Error ? error.message : String(error);
      await showToast({ style: Toast.Style.Failure, title: 'Failed to generate to-dos', message: errorMessage });
    }
  }

  const isLoading = isLoadingTags || isLoadingAreas;
  const error = tagsError || areasError;

  if (error) {
    return <ErrorView error={error} />;
  }

  const now = new Date();

  return (
    <Form
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add New Project" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action title="Generate To-Dos with AI" icon={Icon.BulletPoints} onAction={generateToDos} />
          <ActionPanel.Section>
            <Action
              title="Focus Title"
              icon={Icon.TextInput}
              onAction={() => focus('title')}
              shortcut={{ modifiers: ['cmd'], key: '1' }}
            />
            <Action
              title="Focus Notes"
              icon={Icon.TextInput}
              onAction={() => focus('notes')}
              shortcut={{ modifiers: ['cmd'], key: '2' }}
            />
            <Action
              title="Focus When"
              icon={Icon.TextInput}
              onAction={() => focus('when')}
              shortcut={{ modifiers: ['cmd'], key: 's' }}
            />
            <Action
              title="Focus List"
              icon={Icon.TextInput}
              onAction={() => focus('areaId')}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'm' }}
            />
            <Action
              title="Focus Tags"
              icon={Icon.TextInput}
              onAction={() => focus('tags')}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 't' }}
            />
            <Action
              title="Focus Checklist"
              icon={Icon.TextInput}
              onAction={() => focus('toDos')}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
            />
            <Action
              title="Focus Deadline"
              icon={Icon.TextInput}
              onAction={() => focus('deadline')}
              shortcut={{ modifiers: ['cmd', 'shift'], key: 'd' }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New project" />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Write some notes (Markdown enabled)"
        enableMarkdown
      />
      <Form.Separator />
      <Form.Dropdown {...itemProps.when} title="When">
        <Form.Dropdown.Item value="" title="No date" />
        <Form.Dropdown.Item value="today" {...listItems.today} />
        <Form.Dropdown.Item value="evening" {...listItems.evening} />
        <Form.Dropdown.Item value="tomorrow" {...listItems.tomorrow} />
        <Form.Dropdown.Item value="upcoming" {...listItems.upcoming} />
        <Form.Dropdown.Item value="anytime" {...listItems.anytime} />
        <Form.Dropdown.Item value="someday" {...listItems.someday} />
      </Form.Dropdown>
      {values.when === 'upcoming' && <Form.DatePicker {...itemProps.date} title="Start Date" min={now} />}
      {areas && areas.length > 0 ? (
        <Form.Dropdown {...itemProps.areaId} title="Area">
          <Form.Dropdown.Item value="" title="No area" />
          {areas.map((area) => {
            return (
              <Form.Dropdown.Item
                key={area.id}
                value={area.id}
                title={area.name}
                icon={{ source: Icon.Folder, tintColor: Color.Green }}
              />
            );
          })}
        </Form.Dropdown>
      ) : null}
      {tags && tags.length > 0 ? (
        <Form.TagPicker {...itemProps.tags} title="Tags">
          {tags.map((tag) => (
            <Form.TagPicker.Item value={tag} title={tag} key={tag} />
          ))}
        </Form.TagPicker>
      ) : null}
      <Form.TextArea {...itemProps.toDos} title="To-Dos" placeholder="To-Dos separated by new lines" />
      <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} min={now} />
    </Form>
  );
}

export default function Command({ draftValues }: LaunchProps) {
  return <AddNewProject draftValues={draftValues} />;
}
