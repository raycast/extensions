/**
 * Lemon Squeezy License API.
 *
 * Docs used (verified 2026-10-08):
 * - Validate:   https://docs.lemonsqueezy.com/api/license-api/validate-license-key   (license_key, instance_id?)
 * - Activate:   https://docs.lemonsqueezy.com/api/license-api/activate-license-key   (license_key, instance_name)
 * - Deactivate: https://docs.lemonsqueezy.com/api/license-api/deactivate-license-key (license_key, instance_id)
 * - Rate limit: 60 requests per minute for the License API.
 *
 * POST, form-encoded body, `Accept: application/json`, no API key. Responses carry `valid` / `activated` /
 * `deactivated` plus `error`, `license_key`, `instance` and `meta` (store_id, product_id, customer…).
 * The docs do not list error status codes, so a 4xx with a JSON `error` is treated as a definitive answer and
 * anything else (network, 429, 5xx) as transient.
 */
import { z } from "zod";
import { ProviderError } from "../core/errors";
import { Http } from "../core/http";

export const LICENSE_API = "https://api.lemonsqueezy.com/v1/licenses";

const LicenseKey = z.object({
  id: z.number(),
  status: z.string(),
  activation_limit: z.number().nullish(),
  activation_usage: z.number().nullish(),
  created_at: z.string().nullish(),
  expires_at: z.string().nullish(),
});

const Instance = z.object({ id: z.string(), name: z.string().nullish(), created_at: z.string().nullish() });

const Meta = z.object({
  store_id: z.number(),
  order_id: z.number().nullish(),
  product_id: z.number(),
  product_name: z.string().nullish(),
  variant_name: z.string().nullish(),
  customer_name: z.string().nullish(),
  customer_email: z.string().nullish(),
});

const common = {
  error: z.string().nullish(),
  license_key: LicenseKey.nullish(),
  instance: Instance.nullish(),
  meta: Meta.nullish(),
};

export const ValidateResponse = z.object({ valid: z.boolean(), ...common });
export const ActivateResponse = z.object({ activated: z.boolean(), ...common });
export const DeactivateResponse = z.object({ deactivated: z.boolean(), ...common });

export type ValidateResponse = z.infer<typeof ValidateResponse>;
export type ActivateResponse = z.infer<typeof ActivateResponse>;
export type DeactivateResponse = z.infer<typeof DeactivateResponse>;
export type LicenseMeta = z.infer<typeof Meta>;

export interface LicenseApi {
  validate(key: string, instanceId?: string): Promise<ValidateResponse>;
  activate(key: string, instanceName: string): Promise<ActivateResponse>;
  deactivate(key: string, instanceId: string): Promise<DeactivateResponse>;
}

function form(fields: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) params.set(k, v);
  return params.toString();
}

function licenseError(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = (body as { error?: unknown }).error;
    return typeof error === "string" ? error : undefined;
  }
  return undefined;
}

/**
 * `http` is used for validate and deactivate. `httpNoRetry` is used for activate: a retried activation after a
 * timeout could consume a second activation slot.
 */
export function createLicenseApi(http: Http, httpNoRetry: Http = http): LicenseApi {
  const post = <T>(client: Http, action: string, body: string, schema: z.ZodType<T>) =>
    client({
      source: "license",
      url: `${LICENSE_API}/${action}`,
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
      schema,
      errorMessage: licenseError,
    });
  return {
    validate: (key, instanceId) =>
      post(http, "validate", form({ license_key: key, instance_id: instanceId }), ValidateResponse),
    activate: (key, instanceName) =>
      post(httpNoRetry, "activate", form({ license_key: key, instance_name: instanceName }), ActivateResponse),
    deactivate: (key, instanceId) =>
      post(http, "deactivate", form({ license_key: key, instance_id: instanceId }), DeactivateResponse),
  };
}

/** A 4xx with a message from the License API is a real "no"; everything else might work on retry. */
export function isDefinitiveRejection(error: unknown): boolean {
  return (
    error instanceof ProviderError &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}
