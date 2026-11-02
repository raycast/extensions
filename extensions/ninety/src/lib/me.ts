import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getToken, NinetyError } from "../api/client";
import { getUserByEmail } from "../api/ninety";

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const ID_CLAIMS = ["userId", "user_id", "uid", "_id", "id", "sub"];
const EMAIL_CLAIMS = ["email", "primaryEmail", "userEmail"];

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const parts = token.split(".");
  if (parts.length < 2) return undefined;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Looks through the payload and one level of nested objects (e.g. `{ user: { _id } }`). */
function findClaim(payload: Record<string, unknown>, keys: string[], accept: (value: string) => boolean) {
  const scopes = [
    payload,
    ...Object.values(payload).filter((v): v is Record<string, unknown> => !!v && typeof v === "object"),
  ];
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === "string" && accept(value)) return value;
    }
  }
  return undefined;
}

function cacheKey(token: string) {
  return `ninety-user-id:${token.slice(-12)}`;
}

/**
 * Ninety has no "current user" endpoint. The Personal Access Token is a JWT that carries the
 * user, so read the user Id from it; fall back to the email preference + GET /users?email=.
 */
export async function getCurrentUserId(): Promise<string> {
  const token = getToken();
  const key = cacheKey(token);
  const cached = await LocalStorage.getItem<string>(key);
  if (cached) return cached;

  const payload = decodeJwtPayload(token);
  let userId = payload ? findClaim(payload, ID_CLAIMS, (v) => OBJECT_ID.test(v)) : undefined;

  if (!userId) {
    const { email: preferenceEmail } = getPreferenceValues<Preferences>();
    const email =
      preferenceEmail?.trim() || (payload ? findClaim(payload, EMAIL_CLAIMS, (v) => v.includes("@")) : undefined);
    if (email) userId = (await getUserByEmail(email))?.id;
  }

  if (!userId) {
    throw new NinetyError(
      400,
      "Couldn't work out your Ninety user from the token. Add your Ninety email in the extension preferences.",
    );
  }

  await LocalStorage.setItem(key, userId);
  return userId;
}
