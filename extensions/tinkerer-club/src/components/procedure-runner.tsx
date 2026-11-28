import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { TinkererApiClient } from "../api/client";
import {
  enumValues,
  buildProcedureInput,
  defaultFormValue,
  ProcedureFormValues,
  schemaHint,
  schemaType,
} from "../lib/form";
import { errorMessage } from "../lib/json";
import { humanizeIdentifier } from "../lib/catalog";
import { ApiProcedure, JsonPrimitive, JsonSchema } from "../types/api";
import { JsonDetail } from "./json-detail";

interface ProcedureRunnerProps {
  client: TinkererApiClient;
  procedure: ApiProcedure;
}

function encodedEnumValue(value: JsonPrimitive): string {
  return JSON.stringify(value);
}

function fieldFor(name: string, schema: JsonSchema, required: boolean) {
  const title = humanizeIdentifier(name);
  const description = schemaHint(schema, required);
  const choices = enumValues(schema);
  const defaultValue = defaultFormValue(schema);

  if (choices) {
    return (
      <Form.Dropdown
        key={name}
        id={name}
        title={title}
        info={description}
        defaultValue={defaultValue === undefined ? "" : encodedEnumValue(defaultValue as JsonPrimitive)}
      >
        {!required ? <Form.Dropdown.Item value="" title="Not Set" /> : null}
        {choices.map((choice) => (
          <Form.Dropdown.Item key={encodedEnumValue(choice)} value={encodedEnumValue(choice)} title={String(choice)} />
        ))}
      </Form.Dropdown>
    );
  }

  const type = schemaType(schema);
  if (type === "boolean") {
    return (
      <Form.Checkbox
        key={name}
        id={name}
        title={title}
        label={title}
        info={description}
        defaultValue={typeof defaultValue === "boolean" ? defaultValue : false}
      />
    );
  }

  if (type === "array" || type === "object" || type === "json") {
    return (
      <Form.TextArea
        key={name}
        id={name}
        title={title}
        info={description}
        placeholder={type === "array" ? "[]" : "{}"}
        {...(typeof defaultValue === "string" ? { defaultValue } : {})}
      />
    );
  }

  return (
    <Form.TextField
      key={name}
      id={name}
      title={title}
      info={description}
      placeholder={required ? "Required" : "Optional"}
      {...(typeof defaultValue === "string" ? { defaultValue } : {})}
    />
  );
}

function isDestructive(path: string): boolean {
  return /(^|\.)(ban|cancel|close|delete|dismiss|reject|remove|revoke|skip|unpublish)/i.test(path);
}

export function ProcedureRunner({ client, procedure }: ProcedureRunnerProps) {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const properties = useMemo(() => Object.entries(procedure.inputSchema.properties ?? {}), [procedure]);
  const required = useMemo(() => new Set(procedure.inputSchema.required ?? []), [procedure]);

  async function submit(values: ProcedureFormValues) {
    let input;
    try {
      input = buildProcedureInput(procedure, values);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid Input", message: errorMessage(error) });
      return;
    }

    if (procedure.type === "mutation") {
      const confirmed = await confirmAlert({
        title: `Run ${procedure.path}?`,
        message: `This mutation can change Tinkerer Club data. Input: ${JSON.stringify(input)}`,
        primaryAction: {
          title: "Run Mutation",
          style: isDestructive(procedure.path) ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });
      if (!confirmed) return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `Running ${procedure.path}` });
    try {
      const result = await client.call(procedure, input);
      toast.style = Toast.Style.Success;
      toast.title = "Procedure Completed";
      push(<JsonDetail client={client} title={procedure.path} data={result} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Procedure Failed";
      toast.message = errorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={procedure.path}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={procedure.type === "mutation" ? "Review and Run Mutation" : "Run Query"}
            icon={procedure.type === "mutation" ? Icon.Hammer : Icon.Play}
            onSubmit={submit}
          />
          <Action.OpenInBrowser title="Open API Docs" url={client.docsUrl} icon={Icon.Code} />
        </ActionPanel>
      }
    >
      <Form.Description title="Procedure" text={`${procedure.path} · ${procedure.type}`} />
      <Form.Description title="Description" text={procedure.description} />
      {properties.length === 0 ? <Form.Description title="Input" text="This procedure takes an empty object." /> : null}
      {properties.map(([name, schema]) => fieldFor(name, schema, required.has(name)))}
    </Form>
  );
}
