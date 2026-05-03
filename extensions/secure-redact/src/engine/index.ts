import {
  RedactionResult,
  RedactionMode,
  DetectionPolicy,
  ThreatFeed,
} from "../types";
import { detectSensitiveData } from "./detector";
import { redactText } from "./redactor";

export function redact(
  text: string,
  mode: RedactionMode,
  policy: DetectionPolicy,
  feeds: ThreatFeed[] = []
): RedactionResult {
  const detections = detectSensitiveData(text, policy, feeds);
  const redactedText = redactText(text, detections, mode);

  return {
    text: redactedText,
    detections,
    redactedCount: detections.length,
  };
}

export * from "./patterns";
export * from "./validators";
export * from "./policies";
export * from "./detector";
export * from "./redactor";
