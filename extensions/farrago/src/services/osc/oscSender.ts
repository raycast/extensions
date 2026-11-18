import dgram from "dgram";

export type SupportedArgType = number | string | boolean;

export class OscSender {
  private remoteHost: string;
  private remotePort: number;

  constructor(remoteHost: string, remotePort: number) {
    this.remoteHost = remoteHost;
    this.remotePort = remotePort;
  }

  protected async send(address: string, args: Array<SupportedArgType>): Promise<void> {
    const socket = dgram.createSocket("udp4");
    const typeTags = args.map((a) => getOscTypeTag(a)).join("");

    const oscArgs = args.map((a) =>
      typeof a === "number" ? encodeOscInt(a) : typeof a === "boolean" ? Buffer.alloc(0) : encodeOscString(a as string),
    );

    const msg = Buffer.concat([encodeOscString(address), encodeOscString("," + typeTags), ...oscArgs]);

    return new Promise((resolve, reject) => {
      socket.send(msg, this.remotePort, this.remoteHost, (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

function encodeOscString(str: string): Buffer {
  const nullPadded = Buffer.from(str + "\0");
  const padding = 4 - (nullPadded.length % 4 || 4);
  return Buffer.concat([nullPadded, Buffer.alloc(padding)]);
}

function encodeOscInt(val: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(val, 0);
  return buf;
}

function getOscTypeTag(value: SupportedArgType, opts?: { throwOnUnknown?: boolean }): string {
  opts ??= {};
  opts.throwOnUnknown ??= true;

  const typeMap: { [key: string]: string } = {
    boolean: "T",
    number: "i",
    string: "s",
  };
  const typeTag = typeMap[typeof value];
  if (!typeTag && opts?.throwOnUnknown) {
    throw new Error(`Unsupported OSC value type: ${typeof value}`);
  }

  return typeTag || "";
}
