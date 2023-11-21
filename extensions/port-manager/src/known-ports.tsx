import { Action, ActionPanel, Form, LaunchType, LocalStorage, launchCommand } from "@raycast/api";
import { Fragment } from "react";
import { Entry, STORAGE_KEY, useKnownProcesses } from "./hooks/useKnownProcesses";

function validateName(e: Entry) {
  if (!e.name && e.port) {
    return "Name is required if port is set, leave both empty to remove entry";
  }
}

function validatePort(e: Entry) {
  if (!e.port && e.name) {
    return "Port is required if name is set, leave both empty to remove entry";
  }
  if (e.port && !/^\d+$/.test(e.port)) {
    return "Port must be a number";
  }
}

export default function Command() {
  const [data, setData] = useKnownProcesses();

  const onChange = (value: string, key: keyof Entry, i: number) => {
    setData((data) => {
      const newData = data ? [...data] : [{ name: "", port: "" }];
      newData[i] = { ...newData[i], [key]: value };
      if (newData.at(-1)!.name || newData.at(-1)!.port) {
        newData.push({ name: "", port: "" });
      }
      return newData;
    });
  };

  return (
    <Form
      isLoading={data === false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Answer"
            onSubmit={() => {
              if (!data) {
                LocalStorage.removeItem(STORAGE_KEY);
              } else {
                const cleanData = data.filter((d) => d.name && d.port);
                LocalStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
              }
              launchCommand({ name: "open-ports", type: LaunchType.UserInitiated });
            }}
          />
        </ActionPanel>
      }
    >
      {data !== false &&
        data.map((d, i) => (
          <Fragment key={i}>
            {i !== 0 && <Form.Separator />}
            <Form.TextField
              title="Name"
              placeholder="my-process-name"
              id={`name[${i}]`}
              value={d.name}
              onChange={(e) => onChange(e, "name", i)}
              error={validateName(d)}
            />
            <Form.TextField
              title="Port"
              placeholder="1234"
              id={`port[${i}]`}
              value={d.port}
              onChange={(e) => onChange(e, "port", i)}
              error={validatePort(d)}
            />
          </Fragment>
        ))}
    </Form>
  );
}
