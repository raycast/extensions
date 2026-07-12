import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { createGroundPacket, draftFromForm } from "../domain/packet";
import {
  CARRIER_TYPES,
  type CorrectionFormValues,
  type GroundPacketRecord,
} from "../domain/types";
import { appendGroundPacket } from "../services/ledger";

interface Props {
  base: GroundPacketRecord;
  onComplete: (record: GroundPacketRecord) => void | Promise<void>;
}

function joined(values: string[]): string {
  return values.join("\n");
}

function evidence(base: GroundPacketRecord): string {
  return base.draft.evidence
    .map((item) =>
      [item.claim, item.sourceRef, item.observedAt]
        .filter(Boolean)
        .join(" || "),
    )
    .join("\n");
}

function uncertainties(base: GroundPacketRecord): string {
  return base.draft.uncertainties
    .map((item) => `[${item.classification}] ${item.statement}`)
    .join("\n");
}

export function CorrectionForm({ base, onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  async function submit(values: CorrectionFormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Appending correction",
    });
    try {
      const draft = draftFromForm(values);
      draft.correctionReason = values.correctionReason.trim();
      const record = createGroundPacket(draft, {
        rootId: base.rootId,
        version: base.version + 1,
        supersedesId: base.id,
      });
      await appendGroundPacket(record);
      await onComplete(record);
      toast.style = Toast.Style.Success;
      toast.title = "Correction appended";
      navigation.pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Correction failed";
      toast.message =
        error instanceof Error ? error.message : "Unknown failure";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Correct v${base.version}: ${base.draft.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Append Corrected Packet"
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Corrections append a new version. The prior packet remains intact as lineage." />
      <Form.TextArea
        id="correctionReason"
        title="Correction Pressure"
        placeholder="What changed, contradicted, aged, failed, or became newly visible?"
      />
      <Form.TextField
        id="title"
        title="Packet Title"
        defaultValue={base.draft.title}
      />
      <Form.Dropdown
        id="carrierType"
        title="Context Type"
        defaultValue={base.draft.carrierType}
      >
        {CARRIER_TYPES.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="situation"
        title="Situation"
        defaultValue={base.draft.situation}
      />
      <Form.TextArea
        id="operativeIntent"
        title="Operative Intent"
        defaultValue={base.draft.operativeIntent}
      />
      <Form.TextArea
        id="explicitRefusals"
        title="Explicit Refusals"
        defaultValue={joined(base.draft.explicitRefusals)}
      />
      <Form.TextArea
        id="constraints"
        title="Constraints"
        defaultValue={joined(base.draft.constraints)}
      />
      <Form.TextArea
        id="authorityBoundary"
        title="Authority Boundary"
        defaultValue={base.draft.authorityBoundary}
      />
      <Form.TextArea
        id="scopeBoundary"
        title="Scope Boundary"
        defaultValue={base.draft.scopeBoundary}
      />
      <Form.TextArea
        id="evidence"
        title="Evidence"
        defaultValue={evidence(base)}
      />
      <Form.TextArea
        id="uncertainties"
        title="Typed Uncertainty"
        defaultValue={uncertainties(base)}
      />
      <Form.TextArea
        id="nextMove"
        title="Next Move"
        defaultValue={base.draft.nextMove}
      />
      <Form.TextArea
        id="nextMoveRequirements"
        title="Next Move Requirements"
        defaultValue={joined(base.draft.nextMoveRequirements)}
      />
      <Form.TextArea
        id="sourceContext"
        title="Source Context"
        defaultValue={base.draft.sourceContext}
      />
    </Form>
  );
}
