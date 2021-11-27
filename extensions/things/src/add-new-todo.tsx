import { ActionPanel, Form, SubmitFormAction, showToast, ToastStyle, useNavigation } from '@raycast/api';
import _ from 'lodash';
import { exec } from 'child_process';
import { useEffect, useState } from 'react';
import { promisify } from 'util';
import { ListName, executeJxa } from './shared';
import ShowList from './show-list';

const asyncExec = promisify(exec);

interface FormValues {
  title: string;
  notes?: string;
  tags?: string;
  list?: string;
  when?: string;
  date?: string;
  'checklist-items'?: string;
  deadline?: string;
}

const getTags = () =>
  executeJxa(`
  const things = Application('Things');
  return things.tags().map(tag => tag.name());
`);

const buildJSON = (values: FormValues) => [
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

const getTargetListName = (list: FormValues['list']): ListName => {
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

export default function AddNewTodo() {
  // const [projects, setProjects] = useState();
  const [tags, setTags] = useState([]);
  const [list, setList] = useState('inbox');

  const { push } = useNavigation();

  useEffect(() => {
    const fetchTags = async () => {
      setTags(await getTags());
    };

    fetchTags();
  }, []);

  async function submit(values: FormValues) {
    if (!values.title) {
      showToast(ToastStyle.Failure, 'Title is required');
      return;
    }

    const json = buildJSON(values);
    const url = `open -g things:///json?data=${encodeURIComponent(JSON.stringify(json))}`;
    await asyncExec(url);

    showToast(ToastStyle.Success, 'New Todo Added');
    const listName = getTargetListName(values.list);
    push(<ShowList listName={listName} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Add New To-Do" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" />
      <Form.TextArea id="notes" title="Notes" />
      {/*<Form.Dropdown id="project" title="Project">
        {projects.map(({ id, name }) => (
          <Form.Dropdown.Item value={id} title={name} key={id} />
        ))}
      </Form.Dropdown>*/}
      <Form.Separator />
      <Form.Dropdown id="list" title="List" onChange={setList} value={list}>
        <Form.Dropdown.Item value="inbox" title="Inbox" />
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="evening" title="This Evening" />
        <Form.Dropdown.Item value="tomorrow" title="Tomorrow" />
        <Form.Dropdown.Item value="upcoming" title="Upcoming" />
        <Form.Dropdown.Item value="anytime" title="Anytime" />
        <Form.Dropdown.Item value="someday" title="Someday" />
      </Form.Dropdown>
      {list === 'upcoming' && <Form.DatePicker id="when" title="When" />}
      <Form.TagPicker id="tags" title="Tags">
        {tags.map((tag) => (
          <Form.TagPicker.Item value={tag} title={tag} key={tag} />
        ))}
      </Form.TagPicker>
      <Form.TextArea id="checklist-items" title="Checklist Items" placeholder="separated by new lines" />
      <Form.DatePicker id="deadline" title="Deadline" />
    </Form>
  );
}
