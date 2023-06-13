import { appendToDailyNote, getGraphs, Graph, ReflectApiError } from "./helpers/api";
import { authorize } from "./helpers/oauth";
import { prependTimestampIfSelected } from "./helpers/dates";

import { Action, ActionPanel, closeMainWindow, Form, popToRoot, showToast, Toast, LocalStorage } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";

interface FormValues {
  note: string;
  prependTimestamp: boolean;
  parentList: string;
  graphId: string;
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
        const text = prependTimestampIfSelected(values.note, values);

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

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea {...itemProps.note} title="Note" />
      <Form.Checkbox {...itemProps.prependTimestamp} label="Prepend Timestamp" storeValue={true} />
      <Form.TextField
        {...itemProps.parentList}
        title="Parent List (Optional)"
        placeholder="i.e. 🗓 Daily Log"
        storeValue={true}
      />
      <Form.Separator />
      <Form.Dropdown {...itemProps.graphId} title="Graph" value={graphId} onChange={setGraphId}>
        {graphs.map((graph) => (
          <Form.Dropdown.Item key={graph.id} value={graph.id} title={graph.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
