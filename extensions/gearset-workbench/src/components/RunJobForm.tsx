import { Action, ActionPanel, Alert, Form, Icon, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { GearsetClient } from "../api";
import { requireApiToken } from "../preferences";
import { PRODUCTION_CONFIRMATION, productionConfirmationMatches } from "../safety";
import { addRunHistory } from "../storage";
import { ConfiguredCiJob } from "../types";

export function RunJobForm({ job }: { job: ConfiguredCiJob }) {
  const { pop } = useNavigation();
  const [confirmation, setConfirmation] = useState("");
  const [commit, setCommit] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (job.environment === "production" && !productionConfirmationMatches(confirmation)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Production confirmation does not match",
        message: `Type ${PRODUCTION_CONFIRMATION} exactly.`,
      });
      return;
    }
    if (job.environment === "sandbox") {
      const confirmed = await confirmAlert({
        title: `Run ${job.name}?`,
        message: "This asks Gearset to start the configured CI job immediately.",
        primaryAction: { title: "Request Run", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting Gearset CI run…" });
    try {
      const client = new GearsetClient(requireApiToken("automation"));
      const response = await client.startCiJob(job.id, commit.trim() || undefined);
      await addRunHistory(job, response.RunRequestId, commit.trim() || undefined);
      toast.style = Toast.Style.Success;
      toast.title = "Gearset CI run requested";
      toast.message = response.RunRequestId;
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not request the Gearset run";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Run ${job.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Request Gearset Run" icon={Icon.Play} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title={job.environment === "production" ? "⚠️ Production CI job" : "Sandbox CI job"}
        text={`${job.name}\n${job.id}\n\nGearset permissions and job configuration remain authoritative.`}
      />
      <Form.TextField
        id="commit"
        title="Source Git Commit"
        placeholder="Optional commit SHA override"
        value={commit}
        onChange={setCommit}
      />
      {job.environment === "production" ? (
        <Form.TextField
          id="confirmation"
          title={`Type ${PRODUCTION_CONFIRMATION}`}
          placeholder={PRODUCTION_CONFIRMATION}
          value={confirmation}
          onChange={setConfirmation}
          error={confirmation && confirmation !== PRODUCTION_CONFIRMATION ? "Confirmation does not match" : undefined}
        />
      ) : null}
    </Form>
  );
}
