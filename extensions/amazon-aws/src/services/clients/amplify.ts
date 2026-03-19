import { AmplifyClient } from "@aws-sdk/client-amplify";
import { clientCache } from "../client-cache";

export function getAmplifyClient(): AmplifyClient {
  return clientCache.getClient(AmplifyClient, "amplify");
}
