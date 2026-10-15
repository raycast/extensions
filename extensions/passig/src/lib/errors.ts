import { ApiError, InvalidCredentialsError, NetworkError, SessionExpiredError } from "../vendor/client-core/index.js";

/** Messaggio utente (italiano) per un errore qualsiasi. */
export function describeError(err: unknown): string {
  if (err instanceof InvalidCredentialsError) return err.message;
  if (err instanceof SessionExpiredError) return "Sessione scaduta: sblocca di nuovo con la master password";
  if (err instanceof NetworkError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 429) return "Troppi tentativi: riprova tra qualche minuto";
    if (err.status === 403) return "Operazione non consentita";
    return `${err.message} (${err.code})`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
