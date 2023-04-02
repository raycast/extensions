import { Action, ActionPanel, Form, Icon, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { capitalize } from "./shared/capitalize";
import { formatArgumentDate } from "./shared/formatArgumentDate";
import { formatDateToReadable } from "./shared/formatDateToReadable";
import { getDailyLogsForDateUseCaseFactory } from "./factories/getDailyLogsForDateUseCaseFactory";
import { DailyLog } from "./domain/dailyLog/DailyLog";
import { editDailyLogUseCaseFactory } from "./factories/editDailyLogUseCaseFactory";
import { useForm } from "@raycast/utils";
import { randomPlaceholder } from "./shared/randomPlaceholder";

interface DailyLogListArguments {
  date: string;
}

export default function Command(props: { arguments: DailyLogListArguments }) {
  function getDailyLogs(date: Date) {
    return getDailyLogsForDateUseCaseFactory().execute(date);
  }

  const dateInArguments = formatArgumentDate(props.arguments.date);
  const [date] = useState<Date>(dateInArguments);
  const [items, setItems] = useState<DailyLog[]>(getDailyLogs(date));

  const [editingItem, setEditingItem] = useState<DailyLog | null>(null);

  if (editingItem) {
    return (
      <EditDailyLogItem
        item={editingItem}
        onEdited={() => {
          setEditingItem(null);
          setItems(getDailyLogs(date));
        }}
      />
    );
  }

  return (
    <List navigationTitle={formatDateToReadable(date)}>
      {items.map((item) => (
        <List.Item
          key={item.id}
          title={capitalize(item.title)}
          subtitle={item.date.toLocaleTimeString()}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action icon={Icon.Pencil} title={"Edit log entry"} onAction={() => setEditingItem(item)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function EditDailyLogItem(props: { item: DailyLog; onEdited: (item: DailyLog) => void }) {
  const editLogAndExit = (title: string): void => {
    const useCase = editDailyLogUseCaseFactory();
    const editedItem = new DailyLog(props.item.id, props.item.date, title);
    useCase.execute(editedItem);
    showToast(Toast.Style.Success, "Log edited", title);
    props.onEdited(editedItem);
  };

  const { handleSubmit } = useForm<FormData>({
    onSubmit: ({ title }) => editLogAndExit(title),
    validation: {
      title: (title) => {
        if (title?.length === 0) {
          return "Title is required";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="What did you do?"
        placeholder={randomPlaceholder()}
        defaultValue={props.item.title}
      />
    </Form>
  );
}

interface FormData {
  title: string;
}
