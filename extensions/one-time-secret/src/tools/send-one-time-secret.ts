import { OneTimeSecretClient } from "../one-time-secret-client";

type Input = {
  /** The secret to be sent */
  secret: string;
  /** Required. How long should the secret be available for?
   * Choose from the closest option:
   *  value="300" title="5 minutes"
   *  value="1800" title="30 minutes"
   *  value="3600" title="1 hour"
   *  value="14400" title="4 hours"
   *  value="43200" title="12 hours"
   *  value="86400" title="1 day"
   *  value="259200" title="3 days"
   *  value="604800" title="7 days"
   *  value="1209600" title="14 days"
   */
  lifetime: string;
  /** Optional. Encrypt the secret with this value. */
  passphrase?: string;
};

export default async function (input: Input) {
  const oneTimeSecretClient = new OneTimeSecretClient();
  const response = await oneTimeSecretClient.storeAnonymousSecret(input.secret, input.lifetime, input.passphrase);
  return oneTimeSecretClient.getShareableUrl(response.secret_key);
}
