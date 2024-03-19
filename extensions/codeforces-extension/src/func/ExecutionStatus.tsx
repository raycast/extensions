import { Color } from "@raycast/api";
export function getExecutionStatusColor(status: string) {
  switch (status) {
    case "FAILED":
      return Color.Red;
    case "OK":
      return Color.Green;
    case "PARTIAL":
      return Color.Yellow;
    case "COMPILATION_ERROR":
      return Color.Red;
    case "RUNTIME_ERROR":
      return Color.Red;
    case "WRONG_ANSWER":
      return Color.Red;
    case "PRESENTATION_ERROR":
      return Color.Yellow;
    case "TIME_LIMIT_EXCEEDED":
      return Color.Red;
    case "MEMORY_LIMIT_EXCEEDED":
      return Color.Orange;
    case "IDLENESS_LIMIT_EXCEEDED":
      return Color.Orange;
    case "SECURITY_VIOLATED":
      return Color.Red;
    case "CRASHED":
      return Color.Red;
    case "INPUT_PREPARATION_CRASHED":
      return Color.Orange;
    case "CHALLENGED":
      return Color.Blue;
    case "SKIPPED":
      return Color.Yellow;
    case "TESTING":
      return Color.Magenta;
    case "REJECTED":
      return Color.Red;
    default:
      return Color.PrimaryText;
  }
}

export function getExecutionStatusString(status: string) {
  switch (status) {
    case "FAILED":
      return "Failed";
    case "OK":
      return "Accepted";
    case "PARTIAL":
      return "Partial Success";
    case "COMPILATION_ERROR":
      return "Compilation Error";
    case "RUNTIME_ERROR":
      return "Runtime Error";
    case "WRONG_ANSWER":
      return "Wrong Answer";
    case "PRESENTATION_ERROR":
      return "Presentation Error";
    case "TIME_LIMIT_EXCEEDED":
      return "Time Limit Exceeded";
    case "MEMORY_LIMIT_EXCEEDED":
      return "Memory Limit Exceeded";
    case "IDLENESS_LIMIT_EXCEEDED":
      return "Idleness Limit Exceeded";
    case "SECURITY_VIOLATED":
      return "Security Violated";
    case "CRASHED":
      return "Crashed";
    case "INPUT_PREPARATION_CRASHED":
      return "Input Preparation Crashed";
    case "CHALLENGED":
      return "Challenged";
    case "SKIPPED":
      return "Skipped";
    case "TESTING":
      return "Testing";
    case "REJECTED":
      return "Rejected";
    default:
      return "Unknown Status";
  }
}
