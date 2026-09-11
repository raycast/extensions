function extractErrorText(error: unknown): string {
  if (error instanceof Error) {
    const maybeError = error as Error & { stderr?: string; stdout?: string };
    return [maybeError.message, maybeError.stderr, maybeError.stdout].filter(Boolean).join("\n");
  }

  if (typeof error === "string") {
    return error;
  }

  return String(error);
}

export function mapMmdcError(error: unknown): Error {
  const errorText = extractErrorText(error);

  if (errorText.includes("Could not find Chrome")) {
    return new Error(
      "Compatible rendering could not launch its browser. Open Mermaid to Image and choose Download Browser, then try again.",
    );
  }
  if (errorText.includes("ETIMEDOUT")) {
    return new Error("Diagram generation timed out. Try increasing the timeout in preferences.");
  }
  if (errorText.includes("UnknownDiagramError") || errorText.includes("No diagram type detected")) {
    return new Error("Invalid Mermaid syntax. Please check your diagram code.");
  }
  if (errorText.includes("syntax error")) {
    return new Error("Mermaid syntax error. Please check your diagram code for mistakes.");
  }
  if (errorText.includes("Command failed")) {
    return new Error(`Failed to execute Mermaid CLI.\n\nDetails:\n${errorText}`);
  }

  return new Error(`Failed to generate diagram. Please verify your Mermaid syntax.\n\nDetails:\n${errorText}`);
}
