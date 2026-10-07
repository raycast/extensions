import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useForm, usePromise } from "@raycast/utils";
import { ServiceContext, cliCommands } from "../cli";
import {
  VariableItem,
  deleteVariable,
  fetchVariables,
  isRailwayProvidedVariable,
  serviceUrl,
  upsertVariable,
} from "../railway";

interface VariableListProps {
  context: ServiceContext;
  serviceName: string;
  environmentName: string;
}

export function VariableList({ context, serviceName, environmentName }: VariableListProps) {
  const [showValues, setShowValues] = useState(false);

  // Variables are secrets, so they are fetched fresh instead of being persisted in the cache
  const {
    isLoading,
    data: variables = [],
    revalidate,
  } = usePromise(fetchVariables, [context.projectId, context.environmentId, context.serviceId]);

  const userVariables = variables.filter((v) => !v.isRailwayProvided);
  const railwayVariables = variables.filter((v) => v.isRailwayProvided);
  const existingNames = userVariables.map((v) => v.name);

  const addAction = (
    <Action.Push
      title="Add Variable"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={
        <VariableForm context={context} serviceName={serviceName} existingNames={existingNames} onSaved={revalidate} />
      }
    />
  );

  // Shared by every row: a deployed service always has RAILWAY_ variables, so their rows must offer Add too
  const listActions = (
    <>
      {addAction}
      <Action
        title={showValues ? "Hide Values" : "Show Values"}
        icon={showValues ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        onAction={() => setShowValues((v) => !v)}
      />
      {variables.length > 0 && (
        <Action.CopyToClipboard
          title="Copy All as Env File"
          content={formatDotenv(variables)}
          concealed
          shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        />
      )}
      <Action.CopyToClipboard title="Copy CLI Command" icon={Icon.Terminal} content={cliCommands.variables(context)} />
      <Action.OpenInBrowser
        title="Open in Railway"
        url={serviceUrl(context.projectId, context.serviceId, context.environmentId)}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
    </>
  );

  const renderItem = (variable: VariableItem) => (
    <List.Item
      key={variable.name}
      icon={variable.isSealed ? Icon.Lock : variable.isRailwayProvided ? Icon.Gear : Icon.Key}
      title={variable.name}
      subtitle={displayValue(variable, showValues)}
      keywords={showValues && variable.value ? [variable.value] : undefined}
      accessories={variableAccessories(variable)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {variable.value !== null && (
              <Action.CopyToClipboard title="Copy Value" content={variable.value} concealed />
            )}
            {variable.value !== null && (
              <Action.CopyToClipboard
                title="Copy as KEY=VALUE"
                content={formatDotenv([variable])}
                concealed
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            )}
            {isReference(variable) && variable.rawValue && (
              <Action.CopyToClipboard title="Copy Reference" content={variable.rawValue} />
            )}
          </ActionPanel.Section>
          {!variable.isRailwayProvided && (
            <ActionPanel.Section>
              {!variable.isSealed && (
                <Action.Push
                  title="Edit Variable"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={
                    <VariableForm
                      context={context}
                      serviceName={serviceName}
                      variable={variable}
                      existingNames={existingNames}
                      onSaved={revalidate}
                    />
                  }
                />
              )}
              <Action
                title="Delete Variable"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => handleDelete(variable)}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>{listActions}</ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  async function handleDelete(variable: VariableItem) {
    const confirmed = await confirmAlert({
      title: `Delete ${variable.name}?`,
      message: `The variable will be removed from ${serviceName} in ${environmentName}.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: `Deleting ${variable.name}` });
    try {
      await deleteVariable(context.projectId, context.environmentId, context.serviceId, variable.name);
      toast.style = Toast.Style.Success;
      toast.title = `Deleted ${variable.name}`;
      revalidate();
    } catch (error) {
      await showFailureToast(error, { title: `Failed to delete ${variable.name}` });
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${serviceName} · Variables`} searchBarPlaceholder="Search variables">
      {!isLoading && variables.length === 0 && (
        <List.EmptyView
          icon={Icon.Key}
          title="No Variables"
          description={`${serviceName} has no variables in ${environmentName}`}
          actions={<ActionPanel>{listActions}</ActionPanel>}
        />
      )}
      <List.Section title="Service Variables">{userVariables.map(renderItem)}</List.Section>
      <List.Section title="Railway Provided">{railwayVariables.map(renderItem)}</List.Section>
    </List>
  );
}

const isReference = (variable: VariableItem) =>
  variable.rawValue !== null && variable.value !== null && variable.rawValue !== variable.value;

function displayValue(variable: VariableItem, showValues: boolean): string {
  if (variable.isSealed) return "Sealed";
  if (!showValues) return "••••••••";
  return variable.value ?? "";
}

function variableAccessories(variable: VariableItem): List.Item.Accessory[] {
  if (variable.isSealed) {
    return [{ tag: { value: "Sealed", color: Color.Orange }, tooltip: "Sealed values can't be read back" }];
  }
  if (isReference(variable)) {
    return [{ tag: { value: "Reference", color: Color.Blue }, tooltip: variable.rawValue ?? undefined }];
  }
  return [];
}

// Matches `railway variables --kv`, quoting values a .env parser would otherwise misread
function formatDotenv(variables: VariableItem[]): string {
  return variables
    .map((v) => {
      if (v.value === null) return `# ${v.name} is sealed; its value cannot be read`;
      const needsQuotes = /[\s#"'\\]/.test(v.value);
      return `${v.name}=${needsQuotes ? JSON.stringify(v.value) : v.value}`;
    })
    .join("\n");
}

interface VariableFormValues {
  name: string;
  value: string;
  redeploy: boolean;
}

interface VariableFormProps {
  context: ServiceContext;
  serviceName: string;
  variable?: VariableItem;
  existingNames: string[];
  onSaved: () => void;
}

function VariableForm({ context, serviceName, variable, existingNames, onSaved }: VariableFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<VariableFormValues>({
    initialValues: {
      name: variable?.name ?? "",
      value: variable?.rawValue ?? "",
      redeploy: true,
    },
    validation: {
      name: (name) => {
        const trimmed = name?.trim();
        if (!trimmed) return "Name is required";
        if (isRailwayProvidedVariable(trimmed)) return "RAILWAY_ variables are provided by Railway";
        if (!variable && existingNames.includes(trimmed)) return "This variable already exists";
      },
    },
    async onSubmit(values) {
      const name = variable?.name ?? values.name.trim();
      const toast = await showToast({ style: Toast.Style.Animated, title: `Saving ${name}` });
      try {
        await upsertVariable(
          context.projectId,
          context.environmentId,
          context.serviceId,
          name,
          values.value,
          !values.redeploy,
        );
        toast.style = Toast.Style.Success;
        toast.title = `Saved ${name}`;
        onSaved();
        pop();
      } catch (error) {
        await showFailureToast(error, { title: `Failed to save ${name}` });
      }
    },
  });

  return (
    <Form
      navigationTitle={variable ? `Edit ${variable.name}` : `Add Variable to ${serviceName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={variable ? "Save Variable" : "Add Variable"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {variable ? (
        <Form.Description title="Name" text={variable.name} />
      ) : (
        <Form.TextField title="Name" placeholder="DATABASE_URL" {...itemProps.name} />
      )}
      <Form.TextArea
        title="Value"
        placeholder="Value or a reference like ${{Postgres.DATABASE_URL}}"
        info="Reference other variables with ${{SERVICE_NAME.VARIABLE}}"
        {...itemProps.value}
      />
      <Form.Checkbox label="Redeploy to apply the change" {...itemProps.redeploy} />
    </Form>
  );
}
