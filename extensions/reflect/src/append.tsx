import { appendToDailyNote, getGraphs, Graph, ReflectApiError } from "./helpers/api";
import { prependNote } from "./helpers/dates";
import { authorize } from "./helpers/oauth";

import {
  Action,
  ActionPanel,
  closeMainWindow,
  Form,
  getPreferenceValues,
  LocalStorage,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

interface FormValues {
  note: string;
  prependTimestamp: boolean;
  parentList: string;
  graphId: string;
  timestampFormat?: string;
  isTask: boolean;
}

export default function Command() {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values: FormValues) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Appending to Reflect Daily Note...",
      });

      try {
        const authorizationToken = await authorize();
        const text = prependNote(values.note, {
          isTask: values.isTask,
          prependTimestamp: values.prependTimestamp,
          timestampFormat: values.timestampFormat as "12" | "24" | undefined,
        });

        await appendToDailyNote(authorizationToken, values.graphId, text, values.parentList);
        await LocalStorage.setItem("graphId", values.graphId);

        toast.hide();
        popToRoot();
        closeMainWindow();
      } catch (error) {
        if (error instanceof ReflectApiError) {
          toast.style = Toast.Style.Failure;
          toast.title = error.message;
        }
      }
    },

    validation: {
      note: FormValidation.Required,
      graphId: FormValidation.Required,
    },
  });

  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [graphId, setGraphId] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      const lastGraphId = await LocalStorage.getItem<string>("graphId");

      const authorizationToken = await authorize();
      const graphs = await getGraphs(authorizationToken);
      setGraphs(graphs);

      if (lastGraphId) setGraphId(lastGraphId);
    }

    fetchData();
  }, []);

  const showTimestampFormat: boolean = itemProps.prependTimestamp.value ?? false;

  const { parentLists = "" } = getPreferenceValues<ExtensionPreferences>();

  const parentListOptions = parentLists.split(",").map((item) => item.trim());

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.note} title="Note" />
      <Form.Checkbox {...itemProps.isTask} label="Task" storeValue={true} />
      <Form.Checkbox {...itemProps.prependTimestamp} label="Prepend Timestamp" storeValue={true} />
      {showTimestampFormat ? (
        <Form.Dropdown {...itemProps.timestampFormat} storeValue={true}>
          <Form.Dropdown.Item value="12" title="12 hour" />
          <Form.Dropdown.Item value="24" title="24 hour" />
        </Form.Dropdown>
      ) : null}
      {parentListOptions.length > 0 ? (
        <Form.Dropdown storeValue={true} title="Parent List (Optional)" {...itemProps.parentList}>
          <Form.Dropdown.Item value="" title="-" />
          {parentListOptions.map((opt) => {
            return <Form.Dropdown.Item key={opt} value={opt} title={opt.replaceAll("[", "").replaceAll("]", "")} />;
          })}
        </Form.Dropdown>
      ) : null}
      <Form.Separator />
      <Form.Dropdown {...itemProps.graphId} title="Graph" value={graphId} onChange={setGraphId}>
        {graphs.map((graph) => (
          <Form.Dropdown.Item key={graph.id} value={graph.id} title={graph.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
