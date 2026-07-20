/**
 * gRPC-web protobuf scanner for grok.com GetGrokCreditsConfig.
 * Ported from CodexBar's GrokWebBillingFetcher (scan fixed32 + varint fields by path).
 */

export interface GrokWebBillingSnapshot {
  usedPercent: number;
  resetsAt: Date | null;
}

interface Fixed32Field {
  path: number[];
  value: number;
  order: number;
}

interface VarintField {
  path: number[];
  value: number;
}

interface ProtobufScan {
  fixed32Fields: Fixed32Field[];
  varintFields: VarintField[];
}

function emptyScan(): ProtobufScan {
  return { fixed32Fields: [], varintFields: [] };
}

function mergeScan(target: ProtobufScan, other: ProtobufScan): void {
  target.fixed32Fields.push(...other.fixed32Fields);
  target.varintFields.push(...other.varintFields);
}

function readVarint(bytes: Uint8Array, index: { value: number }): number | null {
  let value = 0;
  let shift = 0;
  while (index.value < bytes.length && shift < 64) {
    const byte = bytes[index.value];
    index.value += 1;
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return value >>> 0;
    shift += 7;
  }
  return null;
}

function scanProtobuf(
  data: Uint8Array,
  depth: number,
  path: number[],
  order: number,
): { scan: ProtobufScan; order: number } {
  const scan = emptyScan();
  const index = { value: 0 };
  let nextOrder = order;

  while (index.value < data.length) {
    const fieldStart = index.value;
    const key = readVarint(data, index);
    if (key === null || key === 0) {
      index.value = fieldStart + 1;
      continue;
    }

    const fieldNumber = key >>> 3;
    const wireType = key & 0x07;
    const fieldPath = [...path, fieldNumber];

    switch (wireType) {
      case 0: {
        const value = readVarint(data, index);
        if (value === null) {
          index.value = fieldStart + 1;
          break;
        }
        scan.varintFields.push({ path: fieldPath, value });
        break;
      }
      case 1: {
        if (index.value + 8 > data.length) return { scan, order: nextOrder };
        index.value += 8;
        break;
      }
      case 2: {
        const length = readVarint(data, index);
        if (length === null || length > data.length - index.value) {
          index.value = fieldStart + 1;
          break;
        }
        const start = index.value;
        const end = index.value + length;
        if (depth < 4) {
          const nested = scanProtobuf(data.subarray(start, end), depth + 1, fieldPath, nextOrder);
          mergeScan(scan, nested.scan);
          nextOrder = nested.order;
        }
        index.value = end;
        break;
      }
      case 5: {
        if (index.value + 4 > data.length) return { scan, order: nextOrder };
        const bitPattern =
          data[index.value] |
          (data[index.value + 1] << 8) |
          (data[index.value + 2] << 16) |
          (data[index.value + 3] << 24);
        const floatView = new DataView(new ArrayBuffer(4));
        floatView.setUint32(0, bitPattern >>> 0, true);
        scan.fixed32Fields.push({
          path: fieldPath,
          value: floatView.getFloat32(0, true),
          order: nextOrder,
        });
        nextOrder += 1;
        index.value += 4;
        break;
      }
      default:
        index.value = fieldStart + 1;
        break;
    }
  }

  return { scan, order: nextOrder };
}

function looksLikeProtobufPayload(data: Uint8Array): boolean {
  if (data.length === 0) return false;
  const first = data[0];
  const fieldNumber = first >>> 3;
  const wireType = first & 0x07;
  return fieldNumber > 0 && (wireType === 0 || wireType === 1 || wireType === 2 || wireType === 5);
}

/** Extract data frames from a gRPC-web response (skip trailer frames with flag 0x80). */
export function grpcWebDataFrames(data: Uint8Array): Uint8Array[] {
  const frames: Uint8Array[] = [];
  let index = 0;
  while (index + 5 <= data.length) {
    const flags = data[index];
    const length = (data[index + 1] << 24) | (data[index + 2] << 16) | (data[index + 3] << 8) | data[index + 4];
    const start = index + 5;
    const end = start + length;
    if (length < 0 || end > data.length) return [];
    if ((flags & 0x80) === 0) {
      frames.push(data.subarray(start, end));
    }
    index = end;
  }
  return frames;
}

export function grpcWebTrailerFields(data: Uint8Array): Record<string, string> {
  const fields: Record<string, string> = {};
  let index = 0;
  while (index + 5 <= data.length) {
    const flags = data[index];
    const length = (data[index + 1] << 24) | (data[index + 2] << 16) | (data[index + 3] << 8) | data[index + 4];
    const start = index + 5;
    const end = start + length;
    if (length < 0 || end > data.length) break;
    if ((flags & 0x80) !== 0) {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(data.subarray(start, end));
      for (const line of text.split(/\r?\n/)) {
        if (!line) continue;
        const separator = line.indexOf(":");
        if (separator < 0) continue;
        const key = line.slice(0, separator).trim().toLowerCase();
        const value = line.slice(separator + 1).trim();
        fields[key] = value;
      }
    }
    index = end;
  }
  return fields;
}

export function validateGrpcWebTrailers(data: Uint8Array): void {
  const fields = grpcWebTrailerFields(data);
  const rawStatus = fields["grpc-status"];
  if (rawStatus === undefined) return;
  const status = Number(rawStatus);
  if (!Number.isFinite(status) || status === 0) return;
  const message = fields["grpc-message"] ?? "";
  throw new Error(`gRPC status ${status}: ${message}`);
}

/**
 * Label for the primary credits bar based on reset distance.
 * Mirrors CodexBar: ~weekly (4–12d) or ~monthly (20–45d), else "Credits".
 */
export function primaryWindowLabel(resetsAt: Date | null, now: Date = new Date()): string {
  if (!resetsAt) return "Credits";
  const seconds = resetsAt.getTime() / 1000 - now.getTime() / 1000;
  if (seconds <= 3600) return "Credits";
  const days = Math.round(seconds / 86400);
  if (days >= 4 && days <= 12) return "Weekly";
  if (days >= 20 && days <= 45) return "Monthly";
  return "Credits";
}

export function parseGrokWebBillingResponse(data: Uint8Array, now: Date = new Date()): GrokWebBillingSnapshot {
  validateGrpcWebTrailers(data);

  let payloads = grpcWebDataFrames(data);
  if (payloads.length === 0 && looksLikeProtobufPayload(data)) {
    payloads = [data];
  }
  if (payloads.length === 0) {
    throw new Error("Grok web billing returned no protobuf payload");
  }

  const scan = emptyScan();
  for (const payload of payloads) {
    mergeScan(scan, scanProtobuf(payload, 0, [], 0).scan);
  }

  const percentCandidates = scan.fixed32Fields.filter(
    (field) =>
      field.path[field.path.length - 1] === 1 && Number.isFinite(field.value) && field.value >= 0 && field.value <= 100,
  );
  percentCandidates.sort((lhs, rhs) =>
    lhs.path.length === rhs.path.length ? lhs.order - rhs.order : lhs.path.length - rhs.path.length,
  );
  const parsedPercent = percentCandidates.length > 0 ? percentCandidates[0].value : null;

  const resetFields = scan.varintFields
    .map((field) => {
      const raw = field.value;
      if (raw < 1_700_000_000 || raw > 2_100_000_000) return null;
      return { path: field.path, date: new Date(raw * 1000) };
    })
    .filter((item): item is { path: number[]; date: Date } => item !== null);

  const futureResetFields = resetFields.filter((item) => item.date.getTime() > now.getTime());
  const preferredReset = futureResetFields
    .filter((item) => item.path.length === 3 && item.path[0] === 1 && item.path[1] === 5 && item.path[2] === 1)
    .map((item) => item.date)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const fallbackReset = futureResetFields.map((item) => item.date).sort((a, b) => a.getTime() - b.getTime())[0];
  const reset = preferredReset ?? fallbackReset ?? null;

  const hasUsagePeriod = scan.varintFields.some(
    (field) =>
      (field.path.length >= 2 && field.path[0] === 1 && field.path[1] === 6) ||
      (field.path.length === 3 &&
        field.path[0] === 1 &&
        field.path[1] === 8 &&
        field.path[2] === 1 &&
        (field.value === 1 || field.value === 2)),
  );
  const noUsageYet = parsedPercent === null && scan.fixed32Fields.length === 0 && reset !== null && hasUsagePeriod;

  if (parsedPercent === null && !noUsageYet) {
    throw new Error("Could not parse Grok web billing usage");
  }

  return {
    usedPercent: parsedPercent ?? 0,
    resetsAt: reset,
  };
}
