import {
  ActionPanel,
  Form,
  showToast,
  Icon,
  useNavigation,
  Action,
  Toast,
  LaunchProps,
  Color,
  Detail,
} from '@raycast/api';
import { FormValidation, useCachedPromise, useForm } from '@raycast/utils';
import qs from 'qs';

import { CommandListName, getLists, getTags, silentlyOpenThingsURL, thingsNotRunningError } from './api';
import TodoList from './components/TodoList';
import { getChecklistItemsWithAI, listItems } from './helpers';
import { getDateString } from './utils';

type FormValues = {
  title: string;
  notes: string;
  tags: string[];
  listId: string;
  // Possible values for when: 'today' | 'evening' | 'upcoming' | 'tomorrow' | 'anytime' | 'someday';
  when: string;
  date: Date | null;
  'checklist-items': string;
  deadline: Date | null;
};

type AddNewTodoProps = {
  title?: string;
  commandListName?: string;
  draftValues?: LaunchProps['draftValues'];
};

export function AddNewTodo({ title, commandListName, draftValues }: AddNewTodoProps) {
  const { push } = useNavigation();
  const { data: tags, isLoading: isLoadingTags } = useCachedPromise(() => getTags());
  const { data: lists, isLoading: isLoadingLists } = useCachedPromise(() => getLists());
  const { handleSubmit, itemProps, values, reset, focus, setValue } = useForm<FormValues>({
    async onSubmit() {
      const json = {
        title: values.title,
        notes: values.notes,
        when: values.when === 'upcoming' && values.date ? getDateString(values.date) : values.when,
        'list-id': values.listId,
        deadline: values.deadline ? getDateString(values.deadline) : '',
        tags: values.tags,
        'checklist-items': values['checklist-items'],
      };

      await silentlyOpenThingsURL(`things:///add?${qs.stringify(json)}`);

      showToast({
        style: Toast.Style.Success,
        title: 'Added new to-do',

        primaryAction: {
          title: 'Go to list',
          shortcut: { modifiers: ['cmd'], key: 'g' },
          onAction() {
            let name: CommandListName;
            if (values.when === 'today' || values.when === 'evening') {
              name = 'today';
            } else if (values.when === 'tomorrow' || values.when === 'upcoming') {
              name = 'upcoming';
            } else if (values.when === 'anytime') {
              name = 'anytime';
            } else if (values.when === 'someday') {
              name = 'someday';
            } else {
              name = 'inbox';
            }

            push(<TodoList commandListName={name} />);
          },
        },
      });

      reset({
        title: '',
        notes: '',
        tags: [],
        when: '',
        listId: '',
        'checklist-items': '',
        deadline: null,
      });

      focus('title');
    },
    initialValues: {
      title: title ?? draftValues?.title ?? '',
      notes: draftValues?.notes ?? '',
      tags: draftValues?.tags ?? [],
      when: commandListName ?? draftValues?.when ?? null,
      'checklist-items': draftValues?.['checklist-items'] ?? '',
      deadline: draftValues?.deadline ?? null,
    },
    validation: { title: FormValidation.Required },
  });

  async function generateChecklist() {
    try {
      if (!values.title) {
        await showToast({ style: Toast.Style.Failure, title: 'The to-do should have a title' });
        return;
      }

      const toast = await showToast({ style: Toast.Style.Animated, title: 'Generating checklist' });

      const items = await getChecklistItemsWithAI(values.title, values.notes);
      setValue('checklist-items', items.trim());
      focus('checklist-items');
      toast.hide();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: 'Failed to generate check-list' });
    }
  }

  const isLoading = isLoadingTags || isLoadingLists;

  if (!tags && !isLoading) return <Detail markdown={thingsNotRunningError} />;

  const now = new Date();

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add New To-Do" onSubmit={handleSubmit} icon={Icon.Plus} />
          <Action title="Generate Checklist with AI" icon={Icon.BulletPoints} onAction={generateChecklist} />
        </ActionPanel>
      }
      // Don't enable drafts if coming from another list or an empty view
      enableDrafts={!title && !commandListName}
    >
      <Form.TextField {...itemProps.title} title="Title" placeholder="New to-do" />
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
      {lists && lists.length > 0 ? (
        <Form.Dropdown {...itemProps.listId} title="List">
          <Form.Dropdown.Item value="" title="Inbox" icon={{ source: Icon.Tray, tintColor: Color.Blue }} />
          {lists.map((list) => {
            return <Form.Dropdown.Item key={list.id} value={list.id} {...listItems.list(list)} />;
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
      <Form.TextArea
        {...itemProps['checklist-items']}
        title="Checklist Items"
        placeholder="Items separated by new lines"
      />
      <Form.DatePicker {...itemProps.deadline} title="Deadline" type={Form.DatePicker.Type.Date} min={now} />
    </Form>
  );
}

export default function Command({ draftValues, launchContext }: LaunchProps) {
  return <AddNewTodo draftValues={draftValues} commandListName={launchContext?.list} />;
}
