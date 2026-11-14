import type { TranslationType } from "@/core/results/kinds";
import { RequestError } from "@/shared/errors";

export function invalidResponse(type: TranslationType): RequestError {
  return new RequestError(type, "Invalid translation response", "INVALID_RESPONSE");
}
