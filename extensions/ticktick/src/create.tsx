import {
  Form,
  Action,
  ActionPanel,
  Detail,
  LocalStorage,
  showToast,
  Toast,
  environment,
  AI,
  getPreferenceValues,
  Icon,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useStartApp from "./hooks/useStartApp";
import { addTask } from "./service/osScript";
import useDebouncedCallback from "./hooks/useDebouncedCallback";
import { getProjects } from "./service/project";
import { formatToServerDate } from "./utils/date";
import guessProject from "./service/ai/guessProject";

interface FormValues {
  list: string;
  title: string;
  dueDate: Date | null;
  desc: string;
}

export default function TickTickCreate() {
  const { isInitCompleted } = useStartApp();
  const { autoFillEnabled } = getPreferenceValues<Preferences>();

  const [isLocalDataLoaded, setIsLocalDataLoaded] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const defaultProjectId = await LocalStorage.getItem<string>("defaultAddList");
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      }
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
    setProjectId(newValue);
  }, []);

  const autoFillWithAI = useDebouncedCallback(
    async (title: string) => {
      if (!title) return;
      // Showing a toast to indicate that the AI is guessing the project
      const toast = await showToast(Toast.Style.Animated, "🧠 Guessing...");
      // Guessing the project id based on the title
      const guessedProjectId = await guessProject(title);
      // Changing the project id to the guessed one
      if (guessedProjectId) setProjectId(guessedProjectId);
      // Hiding the toast
      toast.hide();
    },
    500,
    []
  );

  const onTitleChange: NonNullable<Form.TextField.Props["onChange"]> = useCallback(
    (newValue) => {
      setTitle(newValue);
      // If the auto fill is enabled and the user has access to the AI, we call the AI to guess the project
      if (autoFillEnabled && environment.canAccess(AI)) autoFillWithAI(newValue);
    },
    [autoFillWithAI, autoFillEnabled]
  );

  if (isLoading) {
    return <Detail isLoading markdown="" />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusSquare} title="Create Task" onSubmit={handleSubmit} />
          {environment.canAccess(AI) && (
            <Action
              onAction={() => autoFillWithAI(title)}
              icon={Icon.Wand}
              title="Fill the form with AI"
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField
        ref={titleRef}
        id="title"
        value={title}
        onChange={onTitleChange}
        autoFocus
        title="Title"
        placeholder="No Title"
      />
      <Form.Dropdown value={projectId} ref={listPickerRef} id="list" title="List" onChange={onListChange}>
        {listOptions.map((option) => {
          return <Form.Dropdown.Item key={option.id} value={option.id} title={option.name} />;
        })}
      </Form.Dropdown>
      <Form.TextArea ref={descRef} id="desc" title="Description" placeholder="" />
      <Form.DatePicker ref={dueDatePickerRef} id="dueDate" title="Due Date" type={Form.DatePicker.Type.DateTime} />
    </Form>
  );
}
