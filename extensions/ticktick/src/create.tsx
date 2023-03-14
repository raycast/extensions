import { Form, Action, ActionPanel, Detail, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useStartApp from "./hooks/useStartApp";
import { addTask } from "./service/osScript";
import { getProjects } from "./service/project";
import { formatToServerDate } from "./utils/date";

interface FormValues {
  list: string;
  title: string;
  dueDate: Date | null;
  desc: string;
}

export default function TickTickCreate() {
  const { isInitCompleted } = useStartApp();

  const [isLocalDataLoaded, setIsLocalDataLoaded] = useState(false);
  const [defaultAddList, setDefaultAddList] = useState<string>();

  useEffect(() => {
    (async () => {
      setDefaultAddList(await LocalStorage.getItem<string>("defaultAddList"));
      setIsLocalDataLoaded(true);
    })();
  }, []);

  const titleRef = useRef<Form.TextField>(null);
  const descRef = useRef<Form.TextArea>(null);
  const dueDatePickerRef = useRef<Form.DatePicker>(null);
  const listPickerRef = useRef<Form.Dropdown>(null);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (!isInitCompleted) return;
      console.log(values.dueDate, values.dueDate?.toDateString());
      const result = await addTask({
        projectId: values.list,
        // eslint-disable-next-line no-useless-escape
        title: values.title.replace(/"/g, `\"`),
        // eslint-disable-next-line no-useless-escape
        description: values.desc.replace(/"/g, `\"`),
        dueDate: formatToServerDate(values.dueDate),
        isAllDay: false,
      });

      switch (result) {
        case true:
          showToast(Toast.Style.Success, "Add success");
          break;
        case false:
          showToast(Toast.Style.Failure, "Add failed");
          break;
        default:
          break;
      }

      titleRef.current?.reset();
      descRef.current?.reset();
    },
    [isInitCompleted]
  );

  const isLoading = useMemo(() => {
    return !isInitCompleted || !isLocalDataLoaded;
  }, [isInitCompleted, isLocalDataLoaded]);

  const listOptions = useMemo(() => {
    if (isInitCompleted) {
      return getProjects().map((project) => ({ id: project.id, name: project.name }));
    }
    return [];
  }, [isInitCompleted]);

  const onListChange: NonNullable<Form.Dropdown.Props["onChange"]> = useCallback((newValue) => {
    LocalStorage.setItem("defaultAddList", newValue);
  }, []);

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField ref={titleRef} id="title" autoFocus title="Title" placeholder="No Title" />
      <Form.Dropdown ref={listPickerRef} id="list" title="List" onChange={onListChange} defaultValue={defaultAddList}>
        {listOptions.map((option) => {
          return <Form.Dropdown.Item key={option.id} value={option.id} title={option.name} />;
        })}
      </Form.Dropdown>
      <Form.TextArea ref={descRef} id="desc" title="Description" placeholder="" />
      <Form.DatePicker ref={dueDatePickerRef} id="dueDate" title="Due Date" type={Form.DatePicker.Type.DateTime} />
    </Form>
  );
}
