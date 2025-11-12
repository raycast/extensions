import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useReducer, useState } from "react";
import { NewRequest, Request, Method } from "~/types";
import { $collections, $currentCollectionId, createRequest, updateRequest } from "~/store";
import { COMMON_HEADER_KEYS, METHODS } from "~/constants";
import { z } from "zod";
import { ErrorDetail } from "./error-view";
import { randomUUID } from "crypto";
import { ResponseActionsEditor } from "~/components/response-actions-editor";
import { KeyValueEditor } from "~/components/key-value-editor";
import { useAtom } from "zod-persist/react";
import { CopyVariableAction, GlobalActions } from "~/components/actions";
import { $currentEnvironmentId, $environments } from "~/store/environments";
import { useRunRequest } from "~/hooks/use-run-request";
import { PreRequestActionsEditor } from "~/components/pre-request-action-editor";

interface RequestFormProps {
  collectionId: string;
  request: Partial<Request>;
}

type FormAction =
  | { type: "SET_FIELD"; payload: { field: keyof Request; value: unknown } }
  | { type: "SET_HEADERS"; payload: Request["headers"] }
  | { type: "SET_RESPONSE_ACTIONS"; payload: Request["responseActions"] }
  | { type: "ADD_HEADER" }
  | { type: "REMOVE_HEADER"; payload: { index: number } }
  | { type: "ADD_RESPONSE_ACTION" }
  | { type: "REMOVE_RESPONSE_ACTION"; payload: { index: number } }
  | { type: "ADD_PRE_REQUEST_ACTION" }
  | { type: "REMOVE_PRE_REQUEST_ACTION"; payload: { index: number } };

// This function contains ALL the logic for updating the state
function requestFormReducer(state: Request, action: FormAction): Request {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.payload.field]: action.payload.value };
    case "SET_HEADERS":
      return { ...state, headers: action.payload };
    case "ADD_HEADER":
      return { ...state, headers: [...state.headers, { key: "", value: "" }] };
    case "REMOVE_HEADER":
      return { ...state, headers: state.headers.filter((_, i) => i !== action.payload.index) };
    case "SET_RESPONSE_ACTIONS":
      return { ...state, responseActions: action.payload };
    case "ADD_RESPONSE_ACTION":
      return {
        ...state,
        responseActions: [
          ...(state.responseActions ?? []),
          { id: randomUUID(), source: "BODY_JSON", sourcePath: "", variableKey: "", storage: "ENVIRONMENT" },
        ],
      };
    case "REMOVE_RESPONSE_ACTION":
      return {
        ...state,
        responseActions: state.responseActions?.filter((_, i) => i !== action.payload.index),
      };
    case "ADD_PRE_REQUEST_ACTION":
      return {
        ...state,
        preRequestActions: [...(state.preRequestActions ?? []), { id: randomUUID(), requestId: "", enabled: true }],
      };
    case "REMOVE_PRE_REQUEST_ACTION":
      return {
        ...state,
        preRequestActions: state.preRequestActions?.filter((_, i) => i !== action.payload.index),
      };
    default:
      return state;
  }
}

export function RequestForm({ collectionId, request: initialRequest }: RequestFormProps) {
  const { push, pop } = useNavigation();
  const { execute: run, isLoading: isRunning, cancel } = useRunRequest();
  const { value: collections } = useAtom($collections);
  const { value: currentCollectionId } = useAtom($currentCollectionId);
  const { value: currentEnvironmentId } = useAtom($currentEnvironmentId);
  const { value: environments } = useAtom($environments);

  const currentCollection = collections.find((c) => c.id === currentCollectionId);
  const currentEnvironment = environments.find((e) => e.id === currentEnvironmentId);

  const [isSaving, setIsSaving] = useState(false);

  const [dirtyRequest, dispatch] = useReducer(requestFormReducer, {
    id: initialRequest.id ?? randomUUID(),
    title: initialRequest.title ?? "",
    url: initialRequest.url ?? "",
    method: initialRequest.method ?? "GET",
    headers: initialRequest.headers ?? [],
    body: initialRequest.body ?? "",
    bodyType: initialRequest.bodyType ?? "NONE",
    params: initialRequest.params ?? "",
    query: initialRequest.query ?? "",
    responseActions: initialRequest.responseActions ?? [],
    preRequestActions: initialRequest.preRequestActions ?? [],
  });

  const [activeHeaderIndex, setActiveHeaderIndex] = useState<number | null>(null);
  const [activeActionIndex, setActiveActionIndex] = useState<number | null>(null);
  const [activePreRequestIndex, setActivePreRequestIndex] = useState<number | null>(null); // ← ADD THIS
  const availableRequests = currentCollection?.requests.filter((r) => r.id !== dirtyRequest.id) ?? [];

  async function handleRun() {
    if (!currentCollection) return;
    void run(dirtyRequest, currentCollection).catch((error) => {
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to run request",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    });
  }

  async function handleSave() {
    setIsSaving(true);

    try {
      if (initialRequest.id) {
        await updateRequest(collectionId, dirtyRequest.id, dirtyRequest);
        void showToast({ title: "Request Updated" });
      } else {
        await createRequest(collectionId, dirtyRequest as NewRequest);
        void showToast({ title: "Request Created" });
        pop(); // ✨ Close the form after creating
      }
    } catch (error) {
      // This block runs if Zod's .parse() throws an error.
      if (error instanceof z.ZodError) {
        // We can format a user-friendly message from the Zod error.
        push(<ErrorDetail error={error} />);
      } else {
        // Handle other unexpected errors.
        void showToast({
          style: Toast.Style.Failure,
          title: "An unknown error occurred",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form
      isLoading={isRunning || isSaving}
      navigationTitle={`${currentEnvironment?.name}`}
      actions={
        <ActionPanel>
          {isRunning ? (
            <Action title="Cancel Request" icon={Icon.XMarkCircle} onAction={cancel} style={Action.Style.Destructive} />
          ) : (
            <Action title="Run Request" icon={Icon.Bolt} onAction={handleRun} />
          )}
          <Action
            title="Save Request"
            icon={Icon.HardDrive}
            onAction={handleSave}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "s" },
              windows: { modifiers: ["ctrl"], key: "s" },
            }}
          />

          <CopyVariableAction currentRequestPreActions={dirtyRequest.preRequestActions} />

          <ActionPanel.Section title="Form Actions">
            <Action
              title="Add Header"
              icon={Icon.Plus}
              onAction={() => dispatch({ type: "ADD_HEADER" })}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, windows: { modifiers: ["ctrl"], key: "h" } }}
            />
            {activeHeaderIndex !== null && (
              <Action
                title="Remove Header"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  if (activeHeaderIndex === null) return;
                  dispatch({ type: "REMOVE_HEADER", payload: { index: activeHeaderIndex } });
                  setActiveHeaderIndex(null);
                  void showToast({ style: Toast.Style.Success, title: "Header Removed" });
                }}
                shortcut={{ macOS: { modifiers: ["ctrl"], key: "h" }, windows: { modifiers: ["alt"], key: "h" } }}
              />
            )}
            <Action
              title="Add Response Action"
              icon={Icon.Plus}
              onAction={() => dispatch({ type: "ADD_RESPONSE_ACTION" })}
              shortcut={{ macOS: { modifiers: ["opt"], key: "r" }, windows: { modifiers: ["alt"], key: "r" } }}
            />
            {activeActionIndex !== null && (
              <Action
                title="Remove Response Action"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  dispatch({ type: "REMOVE_RESPONSE_ACTION", payload: { index: activeActionIndex } });
                  void showToast({ style: Toast.Style.Success, title: "Action Removed" });
                }}
                shortcut={{ macOS: { modifiers: ["ctrl"], key: "r" }, windows: { modifiers: ["ctrl"], key: "r" } }}
              />
            )}
            <Action
              title="Add Pre-Request Action"
              icon={Icon.Plus}
              onAction={() => dispatch({ type: "ADD_PRE_REQUEST_ACTION" })}
              shortcut={{ macOS: { modifiers: ["opt"], key: "p" }, windows: { modifiers: ["alt"], key: "p" } }}
            />
            {activePreRequestIndex !== null && (
              <Action
                title="Remove Pre-Request Action"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => {
                  dispatch({ type: "REMOVE_PRE_REQUEST_ACTION", payload: { index: activePreRequestIndex } });
                  setActivePreRequestIndex(null);
                  void showToast({ style: Toast.Style.Success, title: "Pre-Request Action Removed" });
                }}
                shortcut={{ macOS: { modifiers: ["ctrl"], key: "p" }, windows: { modifiers: ["ctrl"], key: "p" } }}
              />
            )}
          </ActionPanel.Section>
          <GlobalActions />
        </ActionPanel>
      }
    >
      <Form.Description text={`Collection: ${currentCollection?.title ?? "Unknown"}`} />
      <Form.Dropdown
        id="method"
        title="HTTP Method"
        value={dirtyRequest.method}
        onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "method", value } })}
      >
        {Object.keys(METHODS).map((m) => (
          <Form.Dropdown.Item
            key={m}
            value={m}
            title={m}
            icon={{
              source: Icon.Circle,
              tintColor: METHODS[m as keyof typeof METHODS].color,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="title"
        title="Title"
        placeholder="e.g., Get All Users"
        value={dirtyRequest.title}
        // onChange={(title) => setDirtyRequest((old) => ({ ...old, title }))}
        onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "title", value } })}
      />
      <Form.TextField
        id="url"
        title="URL / Path"
        placeholder="/users or https://api.example.com"
        value={dirtyRequest.url}
        onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "url", value } })}
      />

      {(["POST", "PUT", "PATCH"] as Array<Method | undefined>).includes(dirtyRequest.method) && (
        <Form.Dropdown
          id="bodyType"
          title="Body type"
          info=""
          value={dirtyRequest.bodyType}
          onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "bodyType", value } })}
        >
          <Form.Dropdown.Item title="NONE" value="NONE" />
          <Form.Dropdown.Item title="JSON" value="JSON" />
          <Form.Dropdown.Item title="FORM_DATA" value="FORM_DATA" />
        </Form.Dropdown>
      )}
      {/* Conditional fields for Body, Params, etc. */}
      {METHODS[dirtyRequest.method].bodyAllowed && dirtyRequest.bodyType !== "NONE" && (
        <Form.TextArea
          id="body"
          title="Body"
          placeholder="Enter body"
          value={dirtyRequest.body}
          onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "body", value } })}
        />
      )}

      {/* Show Params field for GET */}
      {dirtyRequest.method === "GET" && (
        <Form.TextArea
          id="params"
          title="Params"
          placeholder="Enter params as a JSON object"
          value={dirtyRequest.params}
          onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "params", value } })}
        />
      )}

      {/* Show Query and Variables fields for GraphQL */}
      {dirtyRequest.method === "GRAPHQL" && (
        <>
          <Form.TextArea
            id="query"
            title="Query"
            placeholder="Enter GraphQL query"
            value={dirtyRequest.query}
            onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "query", value } })}
          />
          <Form.TextArea
            id="variables"
            title="Variables"
            placeholder="Enter variables as a JSON object"
            value={dirtyRequest.variables}
            onChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "variables", value } })}
          />
        </>
      )}

      {dirtyRequest.headers.length > 0 && (
        <>
          <Form.Separator />

          <KeyValueEditor
            onActiveIndexChange={setActiveHeaderIndex}
            title="Headers"
            pairs={dirtyRequest.headers}
            onPairsChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "headers", value } })}
            commonKeys={COMMON_HEADER_KEYS}
          />
        </>
      )}

      <Form.Separator />

      <PreRequestActionsEditor
        actions={dirtyRequest.preRequestActions ?? []}
        availableRequests={availableRequests}
        onActionsChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "preRequestActions", value } })}
        onActiveIndexChange={setActivePreRequestIndex}
      />

      <Form.Separator />

      <ResponseActionsEditor
        actions={dirtyRequest.responseActions ?? []}
        onActionsChange={(value) => dispatch({ type: "SET_FIELD", payload: { field: "responseActions", value } })}
        onActiveIndexChange={setActiveActionIndex}
      />
    </Form>
  );
}
