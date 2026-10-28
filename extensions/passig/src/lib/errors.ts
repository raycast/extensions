import {
  ApiError,
  ConflictError,
  ImportError,
  InvalidCredentialsError,
  NetworkError,
  PlanLimitError,
  ResponseFormatError,
  SessionExpiredError,
} from "../vendor/client-core/index.js";
import { t } from "../i18n";
import { SERVER_URL } from "./preferences";

/**
 * Messaggio utente, nella lingua attiva, per un errore qualsiasi.
 * Gli errori tipizzati di client-core portano messaggi fissi in italiano: qui si
 * ri-mappano per classe/codice. I messaggi che arrivano dal server (`ApiError`,
 * `PlanLimitError`) sono già tradotti dall'API in base ad `Accept-Language` e si
 * mostrano così come sono.
 */
export function describeError(err: unknown): string {
  if (err instanceof InvalidCredentialsError) return t("error.invalidCredentials");
  if (err instanceof SessionExpiredError) return t("error.sessionExpired");
  if (err instanceof NetworkError) return t("error.network", { server: SERVER_URL });
  if (err instanceof ConflictError) return t("error.conflict");
  if (err instanceof ResponseFormatError) return t("error.responseFormat");
  if (err instanceof ImportError) return describeImportError(err);
  // 402: il messaggio del server è già localizzato
  if (err instanceof PlanLimitError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 429) return t("error.tooManyAttempts");
    if (err.status === 403) return t("error.forbidden");
    if (err.code.startsWith("HTTP_")) return t("error.http", { status: err.status });
    return `${err.message} (${err.code})`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function describeImportError(err: ImportError): string {
  switch (err.code) {
    case "UNKNOWN_FORMAT":
      return t("importError.unknownFormat");
    case "ENCRYPTED_EXPORT":
      return t("importError.encrypted");
    case "INVALID_FILE":
      return t("importError.invalid");
    case "EMPTY":
      return t("importError.empty");
    case "NEEDS_MAPPING":
      return t("import.csvMappingFailed");
    default:
      return err.message;
  }
}
