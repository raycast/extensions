// GENERATO da scripts/vendor.mjs — non modificare: modifica packages/ e rilancia `npm run vendor`.
/**
 * Flusso di login (ARCHITECTURE.md §3.2):
 *   prelogin → derivazione authKey/stretchKey → login → sblocco userKey/privateKey.
 *
 * La master password e la stretchKey vivono solo per la durata di questa
 * funzione; le chiavi sbloccate restituite vanno tenute in memoria (o in uno
 * storage effimero) dal chiamante.
 */
import { computeAuthKey, memzero, unlockUserKeys, type UnlockedKeys, type UserSelf } from "../shared/index.js";
import { ApiClient, type Tokens } from "./api.js";
import { ApiError, InvalidCredentialsError, SessionExpiredError } from "./errors.js";

export interface LoginResult {
  tokens: Tokens;
  user: UserSelf;
  keys: UnlockedKeys;
}

export async function login(
  api: ApiClient,
  email: string,
  masterPassword: string,
  deviceName: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const pre = await api.prelogin(normalizedEmail);
  const { authKey, stretchKey } = computeAuthKey(masterPassword, pre.kdfSalt, pre.kdfParams);

  let res;
  try {
    res = await api.login({ email: normalizedEmail, authKey, deviceName });
  } catch (err) {
    memzero(stretchKey);
    if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
      throw new InvalidCredentialsError();
    }
    throw err;
  }

  let keys: UnlockedKeys;
  try {
    keys = unlockUserKeys(stretchKey, res.user.encryptedUserKey, res.user.encryptedPrivateKey, res.user.publicKey);
  } catch {
    // Non dovrebbe succedere (il server ha accettato l'authKey) ma non ci fidiamo.
    throw new InvalidCredentialsError("Impossibile decifrare le chiavi utente");
  } finally {
    memzero(stretchKey);
  }

  const tokens = { accessToken: res.accessToken, refreshToken: res.refreshToken };
  await api.setTokens(tokens);
  return { tokens, user: res.user, keys };
}

/**
 * Sblocco con un refresh token già salvato (senza creare una nuova sessione server):
 *   refresh → GET /me → stretchKey dalla master password e dal kdfSalt → sblocco chiavi.
 * Lancia `SessionExpiredError` se il refresh token non è più valido (il chiamante
 * farà il login completo) e `InvalidCredentialsError` se la master password è errata.
 * L'`ApiClient` deve avere già i token impostati (accessToken anche vuoto).
 */
export async function resumeWithMasterPassword(
  api: ApiClient,
  masterPassword: string,
  expectedEmail?: string,
): Promise<LoginResult> {
  const tokens = await api.refresh();
  const me = await api.me();
  if (expectedEmail && me.email !== expectedEmail.trim().toLowerCase()) {
    await api.setTokens(null);
    throw new SessionExpiredError("La sessione appartiene a un altro account");
  }
  const { stretchKey } = computeAuthKey(masterPassword, me.kdfSalt, me.kdfParams);
  try {
    const keys = unlockUserKeys(stretchKey, me.encryptedUserKey, me.encryptedPrivateKey, me.publicKey);
    return { tokens, user: me, keys };
  } catch {
    throw new InvalidCredentialsError("Master password non corretta");
  } finally {
    memzero(stretchKey);
  }
}
