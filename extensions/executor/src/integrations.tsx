import { DeleteExecutorItemAction } from "./components/delete-executor-item-action";
import { workspaceTitle } from "./lib/workspaces";
import { WorkspaceAction } from "./components/workspace-command";
import { withWorkspace } from "./components/workspace-command";
import { ConsoleAction } from "./components/console-action";
import {
  Keyboard,
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { accountCacheKey, listIntegrations } from "./lib/client";
import { saveIntegrationMetadata } from "./lib/integration-metadata";
import { summarize } from "./lib/format";
import { integrationIcon } from "./lib/integrations";
import { ToolBrowser } from "./search-tools";
import { ConnectionSetupForm } from "./components/connection-setup-form";
import { AddIntegration } from "./add-integration";
import type { Integration } from "./lib/types";

function IntegrationMetadataForm({ integration, onSaved }: { integration: Integration; onSaved: () => void }) {
  const { pop } = useNavigation();
  const saving = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string>();

  async function onSubmit(values: { name: string; description: string }) {
    if (saving.current) return;
    if (!values.name.trim()) {
      setNameError("Enter an integration name.");
      return;
    }
    saving.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving Integration Details" });
    try {
      await saveIntegrationMetadata({
        integration: integration.slug,
        name: values.name,
        description: values.description,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Integration Details Saved";
      onSaved();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Could Not Save Integration Details" });
    } finally {
      saving.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={workspaceTitle(`Edit ${integration.name}`)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Integration Details" icon={Icon.Check} onSubmit={onSubmit} />
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={integration.name}
        placeholder="Integration name"
        error={nameError}
        onBlur={(event) => setNameError(event.target.value?.trim() ? undefined : "Enter an integration name.")}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextArea
        id="description"
        title="Description"
        defaultValue={integration.description}
        placeholder="What this integration is used for"
      />
    </Form>
  );
}

function Integrations() {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (_scope: string) => {
      void _scope;
      return listIntegrations();
    },
    [accountCacheKey()],
    {
      initialData: [],
      failureToastOptions: { title: "Could Not Load Integrations" },
    },
  );
  const integrations = [...(data ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  const directory = new Map(integrations.map((integration) => [integration.slug, integration]));

  return (
    <List
      navigationTitle={workspaceTitle("Browse Integrations")}
      isLoading={isLoading}
      searchBarPlaceholder="Search integrations by name or description"
    >
      <List.EmptyView
        icon={error ? Icon.Warning : Icon.Plug}
        title={error ? "Could Not Load Integrations" : "No Integrations Found"}
        description={error ? error.message : "Add an integration to connect a service, or try another search."}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Integration"
              shortcut={Keyboard.Shortcut.Common.New}
              icon={Icon.Plus}
              target={<AddIntegration />}
            />
            <ConsoleAction title="Open Executor" path="/integrations" />
            <Action
              shortcut={Keyboard.Shortcut.Common.Refresh}
              title="Reload Integrations"
              icon={Icon.ArrowClockwise}
              onAction={() => revalidate()}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
      {integrations.map((integration) => (
        <List.Item
          key={integration.slug}
          title={integration.name}
          subtitle={summarize(integration.description)}
          keywords={[integration.slug, integration.description, integration.kind]}
          icon={integrationIcon(integration.slug, directory)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Tools"
                icon={Icon.MagnifyingGlass}
                target={<ToolBrowser initialIntegration={integration.slug} />}
              />
              <Action.Push
                title="Add Connection"
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                icon={Icon.Plus}
                target={<ConnectionSetupForm initialIntegration={integration.slug} />}
              />
              <Action.Push
                title="Edit Integration Details"
                shortcut={Keyboard.Shortcut.Common.Edit}
                icon={Icon.Pencil}
                target={<IntegrationMetadataForm integration={integration} onSaved={() => revalidate()} />}
              />
              <Action.Push
                title="Add Integration"
                shortcut={Keyboard.Shortcut.Common.New}
                icon={Icon.Plus}
                target={<AddIntegration />}
              />
              <ConsoleAction title="Open in Executor" path={`/integrations/${encodeURIComponent(integration.slug)}`} />
              <Action.CopyToClipboard
                title="Copy Integration Slug"
                shortcut={Keyboard.Shortcut.Common.Copy}
                content={integration.slug}
              />
              <Action
                title="Reload Integrations"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={() => revalidate()}
              />
              {integration.canRemove ? (
                <DeleteExecutorItemAction
                  target={{ kind: "integration", integration: integration.slug }}
                  onDeleted={() => {
                    void revalidate();
                  }}
                />
              ) : null}
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default withWorkspace(Integrations);
