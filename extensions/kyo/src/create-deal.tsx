import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { Deals } from "./api/resources";
import {
  usePipelines,
  usePipelineStages,
  useCompanies,
} from "./hooks/useLookups";
import { showKyoError } from "./lib/helpers";
import { LogOutAction } from "./components/AuthActions";

interface DealFormValues {
  name: string;
  pipeline_id: string;
  pipeline_stage_id: string;
  company_id: string;
  value: string;
  confidence: string;
  website: string;
  notes: string;
}

export default function CreateDeal() {
  const { pop } = useNavigation();
  const [pipelineId, setPipelineId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const { data: stages, isLoading: loadingStages } = usePipelineStages(
    pipelineId || undefined,
  );
  const { data: companies, isLoading: loadingCompanies } = useCompanies();

  async function handleSubmit(values: DealFormValues) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    if (!values.pipeline_id) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pipeline is required",
      });
      return;
    }
    setSubmitting(true);
    try {
      const deal = await Deals.create({
        name: values.name.trim(),
        pipeline_id: values.pipeline_id,
        pipeline_stage_id: values.pipeline_stage_id || undefined,
        company_id: values.company_id || undefined,
        value: values.value ? Number(values.value) : undefined,
        confidence: values.confidence ? Number(values.confidence) : undefined,
        website: values.website || undefined,
        notes: values.notes || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Deal created",
        message: deal.name,
      });
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to create deal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={loadingPipelines || submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Deal"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <LogOutAction />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Acme Corp" />
      <Form.Dropdown
        id="pipeline_id"
        title="Pipeline"
        value={pipelineId}
        onChange={setPipelineId}
      >
        <Form.Dropdown.Item value="" title="Select a pipeline…" />
        {pipelines.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="pipeline_stage_id"
        title="Stage"
        isLoading={loadingStages}
      >
        <Form.Dropdown.Item value="" title="Default stage" />
        {stages.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="company_id"
        title="Company"
        isLoading={loadingCompanies}
      >
        <Form.Dropdown.Item value="" title="None" />
        {companies.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField id="value" title="Value" placeholder="5000" />
      <Form.TextField id="confidence" title="Confidence" placeholder="0-100" />
      <Form.TextField
        id="website"
        title="Website"
        placeholder="https://acme.com"
      />
      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="Context about this deal…"
      />
    </Form>
  );
}
