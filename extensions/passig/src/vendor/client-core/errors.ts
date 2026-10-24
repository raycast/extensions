// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Errori tipizzati del client Passig.
 * Tutti derivano da `PassigError` così i chiamanti possono distinguere
 * errori di rete, errori API (con codice e status HTTP), conflitti di
 * versione e chiavi errate.
 */

export class PassigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Il server ha risposto con `{ error: { code, message } }` (o un errore HTTP generico). */
export class ApiError extends PassigError {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
  get isForbidden(): boolean {
    return this.status === 403;
  }
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Impossibile raggiungere il server (DNS, TLS, offline...). */
export class NetworkError extends PassigError {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
  }
}

/** La sessione non è più valida: serve un nuovo login con master password. */
export class SessionExpiredError extends PassigError {
  constructor(message = "Sessione scaduta: effettuare di nuovo il login") {
    super(message);
  }
}

/** PUT /items/:id ha risposto 409: la versione locale è obsoleta. */
export class ConflictError extends PassigError {
  readonly itemId: string;
  constructor(itemId: string) {
    super(`L'elemento ${itemId} è stato modificato da un altro client`);
    this.itemId = itemId;
  }
}

/** Master password errata o materiale cifrato non decifrabile. */
export class InvalidCredentialsError extends PassigError {
  constructor(message = "Email o master password non corretti") {
    super(message);
  }
}

/** Il server ha risposto con un corpo non conforme allo schema atteso. */
export class ResponseFormatError extends PassigError {
  readonly issues: unknown;
  constructor(path: string, issues: unknown) {
    super(`Risposta inattesa da ${path}`);
    this.issues = issues;
  }
}
