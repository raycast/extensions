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
import { Deals } from "../api/resources";
import type { Deal } from "../api/types";
import {
  usePipelines,
  usePipelineStages,
  useCompanies,
} from "../hooks/useLookups";
import { showKyoError } from "../lib/helpers";

/** Edit an existing deal (PATCH — only sends the writable fields Kyo documents). */
export function EditDealForm({
  deal,
  onSaved,
}: {
  deal: Deal;
  onSaved?: (updated: Deal) => void;
}) {
  const { pop } = useNavigation();
  const [pipelineId, setPipelineId] = useState<string>(deal.pipeline_id ?? "");

  const { data: pipelines, isLoading: loadingPipelines } = usePipelines();
  const { data: stages, isLoading: loadingStages } = usePipelineStages(
    pipelineId || undefined,
  );
  const { data: companies } = useCompanies();

  async function submit(values: {
    name: string;
    pipeline_id: string;
    pipeline_stage_id: string;
    company_id: string;
    value: string;
    confidence: string;
    website: string;
    notes: string;
  }) {
    try {
      // PATCH semantics: null CLEARS a field, undefined leaves it untouched.
      // pipeline_stage_id stays undefined when "Unchanged" is selected.
      const updated = await Deals.update(deal.id, {
        name: values.name.trim(),
        pipeline_id: values.pipeline_id || undefined,
        pipeline_stage_id: values.pipeline_stage_id || undefined,
        company_id: values.company_id || null,
        value: values.value ? Number(values.value) : null,
        confidence: values.confidence ? Number(values.confidence) : null,
        website: values.website || null,
        notes: values.notes || null,
      });
      await showToast({ style: Toast.Style.Success, title: "Deal updated" });
      onSaved?.(updated);
      pop();
    } catch (error) {
      await showKyoError(error, "Failed to update deal");
    }
  }

  return (
    <Form
      isLoading={loadingPipelines}
      navigationTitle={`Edit · ${deal.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={deal.name} />
      <Form.Dropdown
        id="pipeline_id"
        title="Pipeline"
        value={pipelineId}
        onChange={setPipelineId}
      >
        {pipelines.map((p) => (
          <Form.Dropdown.Item key={p.id} value={p.id} title={p.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="pipeline_stage_id"
        title="Stage"
        isLoading={loadingStages}
        defaultValue={deal.pipeline_stage_id ?? ""}
      >
        <Form.Dropdown.Item value="" title="Unchanged" />
        {stages.map((s) => (
          <Form.Dropdown.Item key={s.id} value={s.id} title={s.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="company_id"
        title="Company"
        defaultValue={deal.company_id ?? ""}
      >
        <Form.Dropdown.Item value="" title="None" />
        {companies.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>
      <Form.Separator />
      <Form.TextField
        id="value"
        title="Value"
        defaultValue={deal.value?.toString() ?? ""}
      />
      <Form.TextField
        id="confidence"
        title="Confidence"
        defaultValue={deal.confidence?.toString() ?? ""}
      />
      <Form.TextField
        id="website"
        title="Website"
        defaultValue={deal.website ?? ""}
      />
      <Form.TextArea id="notes" title="Notes" defaultValue={deal.notes ?? ""} />
    </Form>
  );
}
