import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { request } from "node:http";

export type Association = { id: string; key: string; hash: string };
export type Entry = { uuid: string; name: string; login: string };
type WireEntry = {
  Uuid: string;
  Name: string;
  Login: string;
  Password?: string | null;
};
export type WireResponse = {
  RequestType: string;
  Success: boolean;
  Hash: string;
  Id?: string;
  Nonce?: string;
  Verifier?: string;
  Entries?: WireEntry[];
};
export type Transport = (
  body: Record<string, unknown>,
  timeoutMs?: number,
) => Promise<WireResponse>;

export function parsePort(value: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(
      "Set a valid MacPassHTTP port (1–65535) in extension preferences.",
    );
  }
  return Number(value);
}

export function encrypt(value: string, key: string, nonce: string): string {
  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "base64"),
    Buffer.from(nonce, "base64"),
  );
  return Buffer.concat([cipher.update(value, "utf8"), cipher.final()]).toString(
    "base64",
  );
}

export function decrypt(value: string, key: string, nonce: string): string {
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "base64"),
    Buffer.from(nonce, "base64"),
  );
  return Buffer.concat([
    decipher.update(value, "base64"),
    decipher.final(),
  ]).toString("utf8");
}

export function titleLookupUrl(title: string): string {
  if (!title)
    throw new Error("Give this entry a title in MacPass, then refresh.");
  // NSURL.host decodes percent escapes. Encoding every UTF-8 byte prevents
  // IDNA conversion and preserves spaces, Unicode, colons, and slashes.
  return `http://${Array.from(Buffer.from(title, "utf8"), (byte) => `%${byte.toString(16).padStart(2, "0")}`).join("")}`;
}

export function localTransport(port: number): Transport {
  parsePort(String(port));
  return (body, timeoutMs = 10_000) =>
    new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 8 * 1024 * 1024) {
              req.destroy(new Error("MacPass returned too much data."));
              return;
            }
            chunks.push(chunk);
          });
          res.on("error", () =>
            reject(
              new Error(
                "The connection to MacPass was interrupted. Try again.",
              ),
            ),
          );
          res.on("end", () => {
            if (res.statusCode === 400) {
              reject(
                new Error(
                  "Open and unlock a database in MacPass, then refresh.",
                ),
              );
              return;
            }
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  "MacPassHTTP did not accept the request. Check the plugin and port.",
                ),
              );
              return;
            }
            try {
              const response = JSON.parse(
                Buffer.concat(chunks).toString("utf8"),
              ) as WireResponse;
              if (
                typeof response.Hash !== "string" ||
                !response.Hash ||
                typeof response.Success !== "boolean" ||
                response.RequestType !== body.RequestType
              ) {
                throw new Error();
              }
              resolve(response);
            } catch {
              reject(new Error("Invalid response from MacPassHTTP."));
            }
          });
        },
      );
      // An absolute deadline also covers a server that sends partial data indefinitely.
      const timer = setTimeout(
        () =>
          req.destroy(
            new Error(
              "MacPass did not respond. Unlock the database or finish its approval dialog, then retry.",
            ),
          ),
        timeoutMs,
      );
      req.on("close", () => clearTimeout(timer));
      req.on("error", (error: NodeJS.ErrnoException) =>
        reject(
          new Error(
            error.code === "ECONNREFUSED"
              ? "Open MacPass and enable MacPassHTTP on the configured port, then refresh."
              : error.message.startsWith("MacPass")
                ? error.message
                : "Could not connect to MacPassHTTP. Check MacPass and try again.",
          ),
        ),
      );
      req.end(data);
    });
}

function verify(
  response: WireResponse,
  association: Pick<Association, "key" | "hash">,
): void {
  try {
    if (
      response.Hash !== association.hash ||
      !response.Nonce ||
      !response.Verifier ||
      Buffer.from(response.Nonce, "base64").length !== 16
    )
      throw new Error();
    const actual = Buffer.from(
      decrypt(response.Verifier, association.key, response.Nonce),
    );
    const expected = Buffer.from(response.Nonce);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error();
  } catch {
    throw new Error(
      "Could not verify MacPass's response. Refresh and reconnect to the database.",
    );
  }
}

export class MacPassClient {
  constructor(private readonly send: Transport) {}

  async databaseHash(): Promise<string> {
    return (await this.send({ RequestType: "test-associate" })).Hash;
  }

  async associate(hash: string): Promise<Association> {
    const key = randomBytes(32).toString("base64");
    const nonce = randomBytes(16).toString("base64");
    const response = await this.send(
      {
        RequestType: "associate",
        Key: key,
        Nonce: nonce,
        Verifier: encrypt(nonce, key, nonce),
      },
      120_000,
    );
    if (!response.Success || !response.Id) {
      throw new Error(
        "Connection was not approved. Unlock MacPass, then connect again.",
      );
    }
    verify(response, { key, hash });
    return { id: response.Id, key, hash };
  }

  private async authenticated(
    type: string,
    association: Association,
    fields: Record<string, string> = {},
  ): Promise<WireResponse> {
    const nonce = randomBytes(16).toString("base64");
    const encrypted = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [
        k,
        encrypt(v, association.key, nonce),
      ]),
    );
    const response = await this.send({
      RequestType: type,
      Id: association.id,
      Nonce: nonce,
      Verifier: encrypt(nonce, association.key, nonce),
      ...encrypted,
    });
    if (!response.Success) {
      throw new Error(
        "MacPass did not authorize access. Unlock the paired database, refresh, or reconnect.",
      );
    }
    verify(response, association);
    if (response.Id !== association.id)
      throw new Error(
        "MacPass returned a different connection. Reconnect to the database.",
      );
    return response;
  }

  async entries(association: Association): Promise<Entry[]> {
    // MacPassHTTP requires a valid Url even for get-all-logins. It strips passwords here.
    const response = await this.authenticated("get-all-logins", association, {
      Url: "https://raycast.local",
    });
    return (response.Entries ?? []).map((entry) => ({
      uuid: decrypt(entry.Uuid, association.key, response.Nonce!),
      name: decrypt(entry.Name, association.key, response.Nonce!),
      login: decrypt(entry.Login, association.key, response.Nonce!),
    }));
  }

  async password(association: Association, entry: Entry): Promise<string> {
    // The protocol has no lookup-by-UUID. Search by the full title, then select
    // the exact UUID among matches (including entries with duplicate titles).
    const response = await this.authenticated("get-logins", association, {
      Url: titleLookupUrl(entry.name),
    });
    const match = response.Entries?.find(
      (item) =>
        decrypt(item.Uuid, association.key, response.Nonce!) === entry.uuid,
    );
    if (!match || match.Password == null)
      throw new Error(
        "The entry was not found. Refresh the list and try again.",
      );
    return decrypt(match.Password, association.key, response.Nonce!);
  }

  async validate(association: Association): Promise<void> {
    await this.authenticated("test-associate", association);
  }
}
