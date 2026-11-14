/** The wire format follows Plasticity's official Blender bridge client.py (MIT). */
export interface ModelObject {
  id: number;
  version: number;
  parentId: number;
  materialId: number;
  flags: number;
  name: string;
  type: string;
  vertices: number;
  triangles: number;
}

export interface ModelInventory {
  filename: string;
  version: number;
  scope: "all" | "visible";
  objects: ModelObject[];
}

const objectTypes: Record<number, string> = { 0: "Solid", 1: "Sheet", 2: "Wire", 5: "Group", 6: "Empty" };
const MAX_MESSAGE_BYTES = 64 * 1024 * 1024;

class Reader {
  offset = 0;
  constructor(private readonly bytes: Buffer) {}
  skip(size: number) {
    if (!Number.isSafeInteger(size) || size < 0 || this.offset + size > this.bytes.length) {
      throw new Error("Plasticity returned a truncated or invalid bridge message.");
    }
    this.offset += size;
  }
  uint() {
    const offset = this.offset;
    this.skip(4);
    return this.bytes.readUInt32LE(offset);
  }
  int() {
    const offset = this.offset;
    this.skip(4);
    return this.bytes.readInt32LE(offset);
  }
  string() {
    const size = this.uint();
    const offset = this.offset;
    this.skip(size);
    const text = this.bytes.toString("utf8", offset, offset + size);
    this.skip((4 - (size % 4)) % 4);
    return text;
  }
  block() {
    const size = this.uint();
    const offset = this.offset;
    this.skip(size);
    return this.bytes.subarray(offset, offset + size);
  }
  array(elementBytes: number) {
    const count = this.uint();
    this.skip(count * elementBytes);
    return count;
  }
  assertEnd() {
    if (this.offset !== this.bytes.length) throw new Error("Plasticity returned unexpected trailing bridge data.");
  }
}

function decodeObjects(reader: Reader): ModelObject[] {
  const count = reader.uint();
  if (count > 100_000) throw new Error("Plasticity model exceeds the 100,000-object inventory limit.");
  const objects: ModelObject[] = [];
  for (let index = 0; index < count; index++) {
    const kind = reader.uint();
    if (!(kind in objectTypes)) throw new Error(`Unsupported Plasticity object type: ${kind}.`);
    const object: ModelObject = {
      type: objectTypes[kind],
      id: reader.uint(),
      version: reader.uint(),
      parentId: reader.int(),
      materialId: reader.int(),
      flags: reader.uint(),
      name: reader.string(),
      vertices: 0,
      triangles: 0,
    };
    if (kind === 0 || kind === 1) {
      object.vertices = reader.array(12);
      object.triangles = reader.array(12);
      reader.array(12); // normals
      reader.array(4); // topology groups
      reader.array(4); // face IDs
    }
    objects.push(object);
  }
  return objects;
}

export function decodeInventory(bytes: Buffer, requestId: number, scope: "all" | "visible"): ModelInventory {
  const reader = new Reader(bytes);
  const expectedType = scope === "all" ? 20 : 22;
  if (reader.uint() !== expectedType || reader.uint() !== requestId) {
    throw new Error("Unexpected Plasticity inventory reply.");
  }
  const status = reader.uint();
  if (status !== 200) throw new Error(`Plasticity bridge rejected the inventory request (${status}).`);
  const filename = reader.string();
  const version = reader.uint();
  const count = reader.uint();
  if (count > 100_000) throw new Error("Plasticity returned too many inventory messages.");
  const objects: ModelObject[] = [];
  for (let index = 0; index < count; index++) {
    const item = new Reader(reader.block());
    // LIST_ALL and LIST_VISIBLE are snapshots made of ADD messages, unlike subscriptions.
    if (item.uint() !== 1) throw new Error("Unsupported Plasticity inventory record.");
    objects.push(...decodeObjects(item));
    item.assertEnd();
    if (objects.length > 100_000) throw new Error("Plasticity model exceeds the 100,000-object inventory limit.");
  }
  reader.assertEnd();
  return { filename, version, scope, objects };
}

export function validatePort(value: string): number {
  if (!/^\d{1,5}$/.test(value)) throw new Error("Bridge Port must be a number between 1 and 65535.");
  const port = Number(value);
  if (port < 1 || port > 65535) throw new Error("Bridge Port must be a number between 1 and 65535.");
  return port;
}

function request(type: number, id: number): Buffer {
  const message = Buffer.alloc(8);
  message.writeUInt32LE(type, 0);
  message.writeUInt32LE(id, 4);
  return message;
}

export async function inspectModel(
  port: number,
  scope: "all" | "visible",
  signal?: AbortSignal,
): Promise<ModelInventory> {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`);
  socket.binaryType = "arraybuffer";
  const listType = scope === "all" ? 20 : 22;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, inventory?: ModelInventory) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      socket.close();
      if (error) reject(error);
      else if (inventory) resolve(inventory);
    };
    const abort = () => finish(new Error("Plasticity inventory request cancelled."));
    const timer = setTimeout(() => finish(new Error("Plasticity bridge did not respond within 10 seconds.")), 10_000);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) return abort();
    socket.addEventListener("open", () => {
      // Both published clients send LIST directly. Version 25.3 predates the optional HANDSHAKE message.
      socket.send(request(listType, 1));
    });
    socket.addEventListener("error", () => {
      finish(new Error("Cannot reach Plasticity’s Blender bridge. Open Plasticity and enable its bridge server."));
    });
    socket.addEventListener("close", () => {
      if (!settled) finish(new Error("Plasticity closed the bridge before the inventory was received."));
    });
    socket.addEventListener("message", (event) => {
      try {
        if (!(event.data instanceof ArrayBuffer)) throw new Error("Plasticity returned a nonbinary bridge message.");
        if (event.data.byteLength > MAX_MESSAGE_BYTES) throw new Error("Model data exceeds the 64 MB inventory limit.");
        const bytes = Buffer.from(event.data);
        if (bytes.length < 8) throw new Error("Plasticity returned an incomplete bridge header.");
        const type = bytes.readUInt32LE(0);
        if (type === listType) finish(undefined, decodeInventory(bytes, 1, scope));
        // The bridge may send a NEW_FILE / NEW_VERSION notification on connection; the snapshot is authoritative.
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
