/**
 * Auth modes accepted by the public API. All three are sent as
 * `Authorization: Bearer <token>`; the server distinguishes them by token
 * format — API keys carry an `sf_` prefix, OAuth tokens are JWTs signed by
 * Better Auth's oauth-provider plugin, Firebase JWTs are issued by Firebase
 * Auth (legacy path, used during the Firebase → Better Auth migration).
 */
export type Auth =
    | { kind: "apiKey"; key: string }
    | { kind: "firebaseIdToken"; token: string }
    | { kind: "oauthBearer"; token: string };

export function authHeaderValue(auth: Auth): string {
    switch (auth.kind) {
        case "apiKey":
            return `Bearer ${auth.key}`;
        case "firebaseIdToken":
            return `Bearer ${auth.token}`;
        case "oauthBearer":
            return `Bearer ${auth.token}`;
    }
}
