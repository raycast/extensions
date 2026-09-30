import { Color, Form, Icon } from "@raycast/api";
import { ResponseAction } from "../types";
import { Fragment } from "react/jsx-runtime";

interface ResponseActionsEditorProps {
  actions: ResponseAction[];
  onActionsChange: (newActions: ResponseAction[]) => void;
  onActiveIndexChange: (index: number | null) => void;
}

export function ResponseActionsEditor({ actions, onActionsChange, onActiveIndexChange }: ResponseActionsEditorProps) {
  function handleActionChange(index: number, field: keyof ResponseAction, value: string) {
    const newActions = [...actions];
    (newActions[index][field] as string) = value;
    onActionsChange(newActions);
  }

  return (
    <>
      <Form.Description title="Response Actions" text="Extract data from this response to use in other requests." />
      {actions.map((action, index) => (
        <Fragment key={action.id}>
          <Form.Dropdown
            id={`action-source-${index}`}
            title={`Rule ${index + 1}: Source`}
            value={action.source}
            onFocus={() => onActiveIndexChange(index)}
            onChange={(newValue) => handleActionChange(index, "source", newValue)}
          >
            <Form.Dropdown.Item value="BODY_JSON" title="Response Body (JSON)" />
            <Form.Dropdown.Item value="HEADER" title="Response Header" />
          </Form.Dropdown>
          <Form.TextField
            id={`action-sourcePath-${index}`}
            title="Path / Header Name"
            placeholder="e.g., data.token or x-auth-token"
            value={action.sourcePath}
            onFocus={() => onActiveIndexChange(index)}
            onChange={(newValue) => handleActionChange(index, "sourcePath", newValue)}
          />
          <Form.TextField
            id={`action-variableKey-${index}`}
            title="Save to Variable"
            placeholder="e.g., authToken"
            value={action.variableKey}
            onFocus={() => onActiveIndexChange(index)}
            onChange={(newValue) => handleActionChange(index, "variableKey", newValue)}
          />
          <Form.Dropdown
            id={`action-storage-${index}`}
            title="Storage"
            value={action.storage ?? "TEMPORARY"}
            info="Temporary: Only available during this request chain. Environment: Saved permanently."
            onFocus={() => onActiveIndexChange(index)}
            onChange={(newValue) => handleActionChange(index, "storage", newValue)}
          >
            <Form.Dropdown.Item
              value="TEMPORARY"
              title="Temporary (request chain only)"
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
            />
            <Form.Dropdown.Item
              value="ENVIRONMENT"
              title="Save to Environment"
              icon={{ source: Icon.Key, tintColor: Color.Green }}
            />
          </Form.Dropdown>
        </Fragment>
      ))}
    </>
  );
}
