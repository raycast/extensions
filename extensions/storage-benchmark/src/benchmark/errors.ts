import { BenchmarkHelperError } from "./engine";

export interface ContextualBenchmarkFailure {
  code: string;
  message: string;
}

export function contextualizeBenchmarkFailure(error: unknown): ContextualBenchmarkFailure {
  if (error instanceof BenchmarkHelperError) return { code: error.code, message: error.message };
  if (error instanceof Error && "code" in error) {
    const code = String(error.code);
    if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
      return {
        code: "destination_not_writable",
        message:
          "Raycast cannot write temporary benchmark data to the selected folder. Choose a writable local folder.",
      };
    }
  }
  return { code: "unexpected_error", message: error instanceof Error ? error.message : String(error) };
}
