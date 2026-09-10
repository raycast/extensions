import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { ValidationError } from "../lib/config/instances";
import {
  DEFAULT_SYNC_FORM,
  buildSyncRequest,
  describeSyncRequest,
  type SyncFormValues,
} from "../lib/argocd/sync";
import type { AppSummary } from "../lib/argocd/types";
import type { ArgoInstance } from "../lib/config/instances";
import { makeClient } from "./deps";
import { SyncStatus } from "./SyncStatus";

interface Props {
  app: AppSummary;
  instance: ArgoInstance;
}

export function SyncForm({ app, instance }: Props) {
  const { push, pop } = useNavigation();
  const [values, setValues] = useState<SyncFormValues>(DEFAULT_SYNC_FORM);
  const [retryLimitError, setRetryLimitError] = useState<string | undefined>(undefined);

  function set<K extends keyof SyncFormValues>(key: K, value: SyncFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  let description: string;
  try {
    description = describeSyncRequest(buildSyncRequest(values));
  } catch {
    description = "Fix the retry limit to see what will be sent.";
  }

  async function submit() {
    setRetryLimitError(undefined);

    let body;
    try {
      body = buildSyncRequest(values);
    } catch (error) {
      if (error instanceof ValidationError) {
        setRetryLimitError(error.message);
        return;
      }
      throw error;
    }

    // A dry run changes nothing on the cluster, so it does not need a confirmation. Everything
    // else names the instance and its environment before it goes anywhere.
    if (!values.dryRun) {
      const confirmed = await confirmAlert({
        title: `Sync ${app.name} on ${instance.name}?`,
        message: `${instance.env === "prod" ? "This is a production instance. " : ""}${describeSyncRequest(body)}`,
        icon: Icon.Warning,
        primaryAction: { title: "Sync", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) {
        return;
      }
    }

    try {
      await makeClient(instance).sync(app.name, app.namespace, body);
      await showToast({
        style: Toast.Style.Success,
        title: values.dryRun ? `Dry run started for ${app.name}` : `Sync started for ${app.name}`,
      });
      pop();
      push(<SyncStatus app={app} instance={instance} />);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync was refused",
        message: (error as Error).message,
      });
    }
  }

  return (
    <Form
      navigationTitle={`Sync ${app.name} on ${instance.name} (${instance.env})`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={values.dryRun ? "Run Dry Run" : "Sync Application"}
            icon={Icon.ArrowClockwise}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Will send" text={description} />
      <Form.Checkbox
        id="dryRun"
        label="Dry run"
        info="Asks ArgoCD what it would do without changing anything. No confirmation needed."
        value={values.dryRun}
        onChange={(value) => set("dryRun", value)}
      />
      <Form.Separator />
      <Form.TextField
        id="revision"
        title="Revision"
        placeholder="leave empty to use the application's target revision"
        value={values.revision}
        onChange={(value) => set("revision", value)}
      />
      <Form.Checkbox
        id="prune"
        label="Prune"
        info="Deletes resources that are no longer in git."
        value={values.prune}
        onChange={(value) => set("prune", value)}
      />
      <Form.Checkbox
        id="applyOnly"
        label="Apply only, skip hooks"
        info="Selects the apply strategy, so PreSync, Sync and PostSync hooks do not run."
        value={values.applyOnly}
        onChange={(value) => set("applyOnly", value)}
      />
      <Form.Checkbox
        id="force"
        label="Force"
        info="Adds --force to the apply, which replaces resources that cannot be patched."
        value={values.force}
        onChange={(value) => set("force", value)}
      />
      <Form.Separator />
      <Form.Checkbox
        id="replace"
        label="Replace"
        info="Replace=true. Uses kubectl replace instead of apply."
        value={values.replace}
        onChange={(value) => set("replace", value)}
      />
      <Form.Checkbox
        id="serverSideApply"
        label="Server-side apply"
        info="ServerSideApply=true. Needed for resources whose annotations exceed the client-side limit."
        value={values.serverSideApply}
        onChange={(value) => set("serverSideApply", value)}
      />
      <Form.Checkbox
        id="pruneLast"
        label="Prune last"
        info="PruneLast=true. Prunes after everything else is healthy."
        value={values.pruneLast}
        onChange={(value) => set("pruneLast", value)}
      />
      <Form.Checkbox
        id="skipSchemaValidation"
        label="Skip schema validation"
        info="Validate=false. Skips the client-side schema check."
        value={values.skipSchemaValidation}
        onChange={(value) => set("skipSchemaValidation", value)}
      />
      <Form.Separator />
      <Form.Checkbox
        id="retry"
        label="Retry on failure"
        value={values.retry}
        onChange={(value) => set("retry", value)}
      />
      {values.retry ? (
        <Form.TextField
          id="retryLimit"
          title="Retry limit"
          info="Backoff is ArgoCD's own default: 5s, doubling, capped at 3m."
          value={values.retryLimit}
          error={retryLimitError}
          onChange={(value) => set("retryLimit", value)}
        />
      ) : null}
    </Form>
  );
}
