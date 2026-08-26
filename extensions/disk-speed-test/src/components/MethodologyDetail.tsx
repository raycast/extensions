import { Detail } from "@raycast/api";

const methodology = `# How Disk Speed Test Works

Disk Speed Test measures **sequential write** and **sequential read** throughput using a temporary file on the selected local volume.

- The native helper asks macOS to bypass the normal filesystem data cache.
- Test bytes are deterministic and high-entropy, avoiding misleading compression gains.
- A short warm-up is excluded from the displayed result.
- The configured byte and time limits bound temporary storage use and SSD writes.
- Elapsed time is checked between aligned chunks; an in-flight macOS I/O or durability flush is allowed to finish and is reported honestly.
- Temporary data is deleted after success, failure, or cancellation.

## Interpreting Results

Task tiers are broad examples, not guarantees for a codec, application, or frame rate. A speed test cannot determine physical disk health. Comparisons are only made against compatible results produced by the same methodology and material configuration.
`;

export function MethodologyDetail() {
  return <Detail markdown={methodology} />;
}
