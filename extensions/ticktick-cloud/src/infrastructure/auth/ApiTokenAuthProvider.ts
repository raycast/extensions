import { createHash } from "node:crypto";

import { AuthenticationError } from "../../domain/errors";
import type { AuthProvider, AuthTarget } from "./AuthProvider";

type ApiTokenPreferences = Pick<Preferences, "apiToken">;
type PreferenceReader = () => ApiTokenPreferences;

export class ApiTokenAuthProvider implements AuthProvider {
  private rejectedPair?: string;

  constructor(readonly target: AuthTarget, private readonly readPreferences: PreferenceReader) {}

  async getAccessToken(): Promise<string> {
    const { token, digest } = this.readTokenAndDigest();
    if (this.rejectedPair === this.rejectedPairFor(digest)) {
      throw new AuthenticationError("The current TickTick API Token was rejected. Update it in extension preferences.");
    }
    return token;
  }

  async invalidate(): Promise<void> {
    const { digest } = this.readTokenAndDigest();
    this.rejectedPair = this.rejectedPairFor(digest);
  }

  async accountCacheKey(): Promise<string> {
    const { digest } = this.readTokenAndDigest();
    return `token:${this.target}:${digest}`;
  }

  private readTokenAndDigest(): { token: string; digest: string } {
    const token = this.readPreferences().apiToken?.trim();
    if (!token) {
      throw new AuthenticationError("Enter a TickTick API Token in extension preferences.");
    }
    return { token, digest: createHash("sha256").update(token).digest("hex") };
  }

  private rejectedPairFor(digest: string): string {
    return `${this.target}:${digest}`;
  }
}
