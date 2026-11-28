import { listDestinations } from "../api/client";
import { canMakeTemporaryLinks } from "../lib/kinds";

/**
 * List the storage destinations configured in Aktar. Each destination is one
 * S3-compatible bucket (kind "s3"), WebDAV server folder ("webdav"), or SFTP
 * server folder ("sftp"); the default one is used when the user doesn't name
 * one. Only s3 destinations can make temporary links.
 */
export default async function tool() {
  const destinations = await listDestinations();
  return {
    destinations: destinations.map((destination) => ({
      id: destination.id,
      name: destination.name,
      kind: destination.kind,
      provider: destination.providerName,
      bucket: destination.bucket,
      publicBaseURL: destination.publicBaseURL || null,
      isDefault: destination.isDefault,
      temporaryLinks: canMakeTemporaryLinks(destination),
    })),
  };
}
