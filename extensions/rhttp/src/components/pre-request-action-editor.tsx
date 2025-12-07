// components/pre-request-action-editor.tsx
import { Form, Icon } from "@raycast/api";
import { PreRequestAction, Request } from "~/types";
import { Fragment } from "react";
import { METHODS } from "~/constants";

interface PreRequestActionsEditorProps {
  actions: PreRequestAction[];
  availableRequests: Request[];
  onActionsChange: (newActions: PreRequestAction[]) => void;
  onActiveIndexChange: (index: number | null) => void;
}

export function PreRequestActionsEditor({
  actions,
  availableRequests,
  onActionsChange,
  onActiveIndexChange,
}: PreRequestActionsEditorProps) {
  function handleActionChange(index: number, field: keyof PreRequestAction, value: string | boolean) {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], [field]: value };
    onActionsChange(newActions);
  }

  return (
    <>
      <Form.Description
        title="Pre-Request Actions"
        text="Run other requests before this one to set up variables (e.g., authentication tokens)"
      />
      {actions.map((action, index) => {
        const selectedRequest = availableRequests.find((r) => r.id === action.requestId);

        return (
          <Fragment key={action.id}>
            <Form.Dropdown
              id={`pre-request-${index}`}
              title={`Pre-Request ${index + 1}`}
              value={action.requestId}
              onFocus={() => onActiveIndexChange(index)}
              onChange={(newValue) => handleActionChange(index, "requestId", newValue)}
            >
              <Form.Dropdown.Item value="" title="Select a request..." />
              {availableRequests.map((req) => (
                <Form.Dropdown.Item
                  key={req.id}
                  value={req.id}
                  title={req.title || req.url}
                  icon={{
                    source: Icon.Circle,
                    tintColor: METHODS[req.method]?.color,
                  }}
                />
              ))}
            </Form.Dropdown>

            <Form.Checkbox
              id={`pre-request-enabled-${index}`}
              label="Enabled"
              value={action.enabled}
              onChange={(newValue) => handleActionChange(index, "enabled", newValue)}
            />

            {selectedRequest && (
              <Form.Description
                text={`💡 This will run "${selectedRequest.title || selectedRequest.url}" first. Make sure it has Response Actions to extract variables.`}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
