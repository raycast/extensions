import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { GroundPacketDetail } from "./components/GroundPacketDetail";
import { EVIDENCE_SYNTAX } from "./domain/constants";
import { createGroundPacket, draftFromForm } from "./domain/packet";
import { CARRIER_TYPES, type GroundPacketFormValues } from "./domain/types";
import { captureOperatingContext } from "./services/context";
import { appendGroundPacket } from "./services/ledger";

export default function CreateGroundPacketCommand() {
  const [situation, setSituation] = useState("");
  const [captureSource, setCaptureSource] = useState("manual entry");
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();

  async function loadContext() {
    const captured = await captureOperatingContext();
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
  }

  useEffect(() => {
    void loadContext();
  }, []);

  async function submit(values: GroundPacketFormValues) {
    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating ground packet",
    });
    try {
      const record = createGroundPacket(draftFromForm(values));
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
            onAction={loadContext}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Context source: ${captureSource}. The packet stays local until you copy it elsewhere. It is portable context, not hidden memory, verification, or authority.`}
      />
      <Form.TextField
        id="title"
        title="Packet Title"
        placeholder="Project or handoff name"
      />
      <Form.Dropdown
        id="carrierType"
        title="Context Type"
        defaultValue="project"
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
        onChange={setSituation}
      />
      <Form.TextArea
        id="operativeIntent"
        title="Operative Intent"
        placeholder="What specific course of action are you actually pursuing?"
      />
      <Form.Separator />
      <Form.TextArea
        id="explicitRefusals"
        title="Explicit Refusals"
        placeholder="One per line: what must this not become, assume, expose, or optimize away?"
      />
      <Form.TextArea
        id="constraints"
        title="Constraints"
        placeholder="One real constraint per line"
      />
      <Form.TextArea
        id="authorityBoundary"
        title="Authority Boundary"
        placeholder="Who may decide or change what? What still requires review?"
      />
      <Form.TextArea
        id="scopeBoundary"
        title="Scope Boundary"
        placeholder="What is in and out of this packet?"
      />
      <Form.Separator />
      <Form.TextArea
        id="evidence"
        title="Evidence"
        placeholder={EVIDENCE_SYNTAX}
      />
      <Form.Description
        text={`Evidence syntax: ${EVIDENCE_SYNTAX}. A claim without a source remains visible but unlinked.`}
      />
      <Form.TextArea
        id="uncertainties"
        title="Typed Uncertainty"
        placeholder="[solid], [inferential], or [unknown] followed by the statement"
      />
      <Form.TextArea
        id="nextMove"
        title="Next Move"
        placeholder="Smallest reversible movement lawful now"
      />
      <Form.TextArea
        id="nextMoveRequirements"
        title="Next Move Requirements"
        placeholder="One required receipt, authority, or condition per line"
      />
      <Form.TextArea
        id="sourceContext"
        title="Source Context"
        placeholder="Where this packet came from and what was not inspected"
      />
    </Form>
  );
}
