import { ActionPanel, Form, Detail, showToast, Icon, useNavigation, Action, Toast } from '@raycast/api';
import _ from 'lodash';
import qs from 'qs';
import { exec } from 'child_process';
import { useEffect, useState } from 'react';
import { promisify } from 'util';
import { ListName, executeJxa, thingsNotRunningError, preferences } from './shared';
import ShowList from './show-list';

const asyncExec = promisify(exec);

const getTags = () =>
  executeJxa(`
  const things = Application('${preferences.thingsAppIdentifier}');
  return things.tags().map(tag => tag.name());
`);

const buildJSON = (values: Form.Values) => [
  {
    type: 'to-do',
    operation: 'create',
    attributes: {
      title: values.title,
      notes: values.notes,
      // 'list-id': values['list-id'],
      when: values.list === 'upcoming' && values.when ? values.when : values.list,
      deadline: values.deadline,
      tags: values.tags,
      'checklist-items': _(values['checklist-items'])
        .split('\n')
        .compact()
        .map((title: string) => ({
          type: 'checklist-item',
          attributes: {
            title,
          },
        }))
        .value(),
    },
  },
];

const getTargetListName = (list: Form.Values['list']): ListName => {
  if (list === 'today' || list === 'evening') {
    return ListName.Today;
  } else if (list === 'tomorrow' || list === 'upcoming') {
    return ListName.Upcoming;
  } else if (list === 'anytime') {
    return ListName.Anytime;
  } else if (list === 'someday') {
    return ListName.Someday;
  } else {
    return ListName.Inbox;
  }
};

export default function AddNewTodo(props: { title?: string; listName?: string }) {
  const defaultValues: Form.Values = {
    title: props.title || '',
    notes: '',
    tags: [],
    list: props.listName?.toLowerCase(),
    when: undefined,
    'checklist-items': '',
    deadline: undefined,
  };

  const [values, setValues] = useState<Form.Values>(defaultValues);
  // const [projects, setProjects] = useState();
  const [tags, setTags] = useState([]);
  const [thingsNotRunning, setThingsNotRunning] = useState(false);
  const { push } = useNavigation();

  useEffect(() => {
    const fetchTags = async () => {
      const results = await getTags();
      if (!results) {
        return setThingsNotRunning(true);
      }

      setTags(results);
    };

    fetchTags();
  }, []);

  const setValue = (key: string) => (value: string | string[] | Date) => {
    setValues({ ...values, [key]: value });
  };

  const addNewTodo = async () => {
    if (!values.title) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Title is required',
      });
      return;
    }

    const json = buildJSON(values);
    const escapedData = qs.stringify({ v: JSON.stringify(json) }).replace(/^v=/, '');
    const url = `open -g things:///json?data=${escapedData}`;
    await asyncExec(url);

    showToast({
      style: Toast.Style.Success,
      title: 'Added New To-Do',
    });
    setValues({ ...defaultValues, title: '' });
  };

  const addNewTodoAndGoToList = async () => {
    await addNewTodo();
    const listName = getTargetListName(values.list);
    push(<ShowList listName={listName} />);
  };

  if (thingsNotRunning) {
    return <Detail markdown={thingsNotRunningError} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Add New To-Do" onAction={addNewTodo} icon={Icon.Plus} />
          <Action title="Add New To-Do and Go To List" onAction={addNewTodoAndGoToList} icon={Icon.ArrowRight} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={values.title} onChange={setValue('title')} />
      <Form.TextArea id="notes" title="Notes" value={values.notes} onChange={setValue('notes')} />
      {/*<Form.Dropdown id="project" title="Project" value={values.project} onChange={setValue('project')}>
        {projects.map(({ id, name }) => (
          <Form.Dropdown.Item value={id} title={name} key={id} />
        ))}
      </Form.Dropdown>*/}
      <Form.Separator />
      <Form.Dropdown id="list" title="List" value={values.list} onChange={setValue('list')}>
        <Form.Dropdown.Item value="inbox" title="Inbox" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="evening" title="This Evening" />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
        <Form.Dropdown.Item value="upcoming" title="Upcoming" />
        <Form.Dropdown.Item value="anytime" title="Anytime" />
        <Form.Dropdown.Item value="someday" title="Someday" />
      </Form.Dropdown>
      {values.list === 'upcoming' && (
        <Form.DatePicker id="when" title="When" value={values.when} onChange={setValue('when')} />
      )}
      <Form.TagPicker id="tags" title="Tags" value={values.tags} onChange={setValue('tags')}>
        {_.map(tags, (tag) => (
          <Form.TagPicker.Item value={tag} title={tag} key={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextArea
        id="checklist-items"
        title="Checklist Items"
        placeholder="separated by new lines"
        value={values['checklist-items']}
        onChange={setValue('checklist-items')}
      />
      <Form.DatePicker id="deadline" title="Deadline" value={values.deadline} onChange={setValue('deadline')} />
    </Form>
  );
}
