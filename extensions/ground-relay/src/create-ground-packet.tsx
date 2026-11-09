import { evidenceToInput, retainEvidenceIds } from "./domain/packet";
import type { GroundPacketDraft } from "./domain/types";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { GroundPacketDetail } from "./components/GroundPacketDetail";
import { EVIDENCE_SYNTAX } from "./domain/constants";
import { createGroundPacket, draftFromForm } from "./domain/packet";
import { CARRIER_TYPES, type GroundPacketFormValues } from "./domain/types";
import { captureOperatingContext } from "./services/context";
import { appendGroundPacket } from "./services/ledger";

export default function CreateGroundPacketCommand({
  initialDraft,
}: { initialDraft?: GroundPacketDraft } = {}) {
  const edited = useRef(false);
  const [situation, setSituation] = useState(initialDraft?.situation ?? "");
  const [captureSource, setCaptureSource] = useState(
    initialDraft ? "structured handoff" : "manual entry",
  );
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  async function loadContext(force = false) {
    try {
      const captured = await captureOperatingContext();
      if (!force && edited.current) return;
      setSituation(captured.text);
      setCaptureSource(
        captured.source === "none" ? "manual entry" : captured.source,
      );
      if (captured.source !== "none") {
        await showToast({
          style: Toast.Style.Success,
          title: `Loaded ${captured.source}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not load context",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  useEffect(() => {
    if (!initialDraft) void loadContext();
  }, []);

  async function submit(values: GroundPacketFormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating ground packet",
    });
    try {
      const draft = draftFromForm(values);
      if (initialDraft) {
        if (initialDraft.handoff) draft.handoff = initialDraft.handoff;
        draft.evidence = retainEvidenceIds(
          draft.evidence,
          initialDraft.evidence,
        );
      }
      const record = createGroundPacket(draft, {
        status: initialDraft ? "ai-candidate" : "user-authored",
      });
      await appendGroundPacket(record);
      toast.style = Toast.Style.Success;
      toast.title = "Ground packet saved locally";
      navigation.push(<GroundPacketDetail record={record} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create packet";
      toast.message =
        error instanceof Error ? error.message : "Unknown failure";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Ground Packet"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Ground Packet"
            icon={Icon.Document}
            onSubmit={submit}
          />
          <Action
            title="Reload Selection or Clipboard"
            icon={Icon.Clipboard}
            onAction={() => loadContext(true)}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Context source: ${captureSource}. The packet stays local until you copy it elsewhere. It is portable context, not hidden memory, verification, or authority.`}
      />
      <Form.TextField
        id="title"
        defaultValue={initialDraft?.title ?? ""}
        title="Packet Title"
        placeholder="Project or handoff name"
      />
      <Form.Dropdown
        id="carrierType"
        defaultValue={initialDraft?.carrierType ?? "project"}
        title="Context Type"
      >
        {CARRIER_TYPES.map((value) => (
          <Form.Dropdown.Item key={value} value={value} title={value} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="situation"
        title="Situation"
        placeholder="What is happening now?"
        value={situation}
        onChange={(value) => {
          edited.current = true;
          setSituation(value);
        }}
      />
      <Form.TextArea
        id="operativeIntent"
        defaultValue={initialDraft?.operativeIntent ?? ""}
        title="Operative Intent"
        placeholder="What specific course of action are you actually pursuing?"
      />
      <Form.Separator />
      <Form.TextArea
        id="explicitRefusals"
        defaultValue={initialDraft?.explicitRefusals.join("\n") ?? ""}
        title="Explicit Refusals"
        placeholder="One per line: what must this not become, assume, expose, or optimize away?"
      />
      <Form.TextArea
        id="constraints"
        defaultValue={initialDraft?.constraints.join("\n") ?? ""}
        title="Constraints"
        placeholder="One real constraint per line"
      />
      <Form.TextArea
        id="authorityBoundary"
        defaultValue={initialDraft?.authorityBoundary ?? ""}
        title="Authority Boundary"
        placeholder="Who may decide or change what? What still requires review?"
      />
      <Form.TextArea
        id="scopeBoundary"
        defaultValue={initialDraft?.scopeBoundary ?? ""}
        title="Scope Boundary"
        placeholder="What is in and out of this packet?"
      />
      <Form.Separator />
      <Form.TextArea
        id="evidence"
        defaultValue={
          initialDraft ? evidenceToInput(initialDraft.evidence) : ""
        }
        title="Evidence"
        placeholder={EVIDENCE_SYNTAX}
      />
      <Form.Description
        text={`Evidence syntax: ${EVIDENCE_SYNTAX}. A claim without a source remains visible but unlinked.`}
      />
      <Form.TextArea
        id="uncertainties"
        defaultValue={
          initialDraft?.uncertainties
            .map((u) => `[${u.classification}] ${u.statement}`)
            .join("\n") ?? ""
        }
        title="Typed Uncertainty"
        placeholder="[solid], [inferential], or [unknown] followed by the statement"
      />
      <Form.TextArea
        id="nextMove"
        defaultValue={initialDraft?.nextMove ?? ""}
        title="Next Move"
        placeholder="Smallest reversible movement lawful now"
      />
      <Form.TextArea
        id="nextMoveRequirements"
        defaultValue={initialDraft?.nextMoveRequirements.join("\n") ?? ""}
        title="Next Move Requirements"
        placeholder="One required receipt, authority, or condition per line"
      />
      <Form.TextArea
        id="sourceContext"
        defaultValue={initialDraft?.sourceContext ?? ""}
        title="Source Context"
        placeholder="Where this packet came from and what was not inspected"
      />
    </Form>
  );
}
