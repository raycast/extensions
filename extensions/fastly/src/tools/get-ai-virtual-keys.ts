import { getArcVirtualKeys, isArcNotEntitledError } from "../api";

/**
 * List AI Runtime Control virtual keys: name, provider, model, rate limits
 * (requests and tokens per minute), AI Firewall security settings, expiry, and
 * last-used time. Returns key metadata only, never access tokens.
 */
export default async function () {
  try {
    const response = await getArcVirtualKeys();
    return (response.data || []).map((key) => ({
      id: key.id,
      name: key.name,
      provider: key.provider,
      model: key.model,
      rpm_limit: key.rpm_limit,
      tpm_limit: key.tpm_limit,
      security_enabled: key.security_enabled,
      security_action: key.security_action,
      expires_at: key.expires_at,
      last_used_at: key.last_used_at,
      created_at: key.created_at,
    }));
  } catch (error) {
    if (isArcNotEntitledError(error)) {
      throw new Error(
        "This Fastly account does not have access to AI Runtime Control. Contact Fastly to enable the product.",
      );
    }
    throw error;
  }
}
