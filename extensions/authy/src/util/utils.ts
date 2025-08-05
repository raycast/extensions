import { AuthenticatorToken, AppEntry } from "../client/dto";
import { encode } from "hi-base32";
import { decryptSeed } from "./totp";
import { getPreferenceValues } from "@raycast/api";
import { Service } from "../component/login/login-helper";

export function mapOtpServices(authenticatorTokens: AuthenticatorToken[], authyApps: AppEntry[]): Service[] {
  const { authyPassword, preferCustomName } = getPreferenceValues<{
    authyPassword: string;
    preferCustomName: boolean;
  }>();

  const apps: Service[] = authyApps.map((i) => {
    return {
      id: i._id,
      name: i.name,
      digits: 7,
      period: 10,
      seed: encode(Buffer.from(i.secret_seed, "hex")),
      type: "authy",
    };
  });

  const services: Service[] = authenticatorTokens.map((i) => {
    const seed = decryptSeed(i.encrypted_seed, i.salt, authyPassword, i.key_derivation_iterations || 1000);
    return {
      id: i.unique_id,
      name: preferCustomName ? i.name || i.original_name : i.original_name || i.name,
      digits: 6,
      period: 30,
      seed: seed,
      accountType: i.account_type,
      issuer: i.issuer,
      logo: i.logo,
      type: "service",
    };
  });

  return [...apps, ...services];
}
