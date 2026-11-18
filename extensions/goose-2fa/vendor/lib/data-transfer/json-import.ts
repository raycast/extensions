import type { NewAccountInput } from "../types";
import { tryGoose2fa, try2FAS, tryAegis } from "./adapters/object-formats";
import { tryAndOTP, tryRaivo, tryFreeOTP } from "./adapters/array-formats";
import { parseAccountArray } from "./adapters/generic-accounts";

export function parseJsonAccounts(trimmed: string): NewAccountInput[] | null {
  try {
    const json = JSON.parse(trimmed);

    if (typeof json === "object" && json !== null && !Array.isArray(json)) {
      // Try named formats in order of specificity
      const obj = json as Record<string, unknown>;
      const goose = tryGoose2fa(obj);
      if (goose && goose.length > 0) return goose;

      const twofas = try2FAS(obj);
      if (twofas && twofas.length > 0) return twofas;

      const aegis = tryAegis(obj);
      if (aegis && aegis.length > 0) return aegis;

      // Object with "accounts" or "entries" array (generic)
      const arr = (obj.accounts ?? obj.entries ?? obj.otp_parameters) as unknown[] | undefined;
      if (Array.isArray(arr)) {
        const generic = parseAccountArray(arr);
        if (generic.length > 0) return generic;
      }
    }

    if (Array.isArray(json) && json.length > 0) {
      // Try array-based formats
      const andotp = tryAndOTP(json);
      if (andotp && andotp.length > 0) return andotp;

      const raivo = tryRaivo(json);
      if (raivo && raivo.length > 0) return raivo;

      const freeotp = tryFreeOTP(json);
      if (freeotp && freeotp.length > 0) return freeotp;

      // Generic array fallback
      const generic = parseAccountArray(json);
      if (generic.length > 0) return generic;
    }
  } catch {
    // not JSON
  }

  return null;
}
