import { listDestinations } from "../api/client";

/**
 * List the storage destinations configured in Aktar. Each destination is one
 * S3-compatible bucket; the default one is used when the user doesn't name one.
 */
export default async function tool() {
  const destinations = await listDestinations();
  return {
    destinations: destinations.map((destination) => ({
      id: destination.id,
      name: destination.name,
      provider: destination.providerName,
      bucket: destination.bucket,
      publicBaseURL: destination.publicBaseURL || null,
      isDefault: destination.isDefault,
    })),
  };
}
