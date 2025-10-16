import * as fs from "fs/promises";
import * as crypto from "crypto";

interface Slot {
  type: number;
  salt: string;
  n: number;
  r: number;
  p: number;
  key: string;
  key_params: {
    nonce: string;
    tag: string;
  };
}

interface Header {
  slots: Slot[];
  params: {
    nonce: string;
    tag: string;
  };
}

interface Data {
  header: Header;
  db: string;
}

export class AegisDB {
  private dbPath: string;
  private data: Data | null = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async loadDb(): Promise<void> {
    const fileContent = await fs.readFile(this.dbPath, "utf8");
    this.data = JSON.parse(fileContent);
  }

  async decryptDb(password: string): Promise<any[]> {
    if (!this.data) {
      throw new Error("Database not loaded. Call loadDb() first.");
    }

    const data = this.data;
    const header = data.header;
    const slots = header.slots.filter((slot) => slot.type === 1);

    let masterKey: Buffer | null = null;

    for (const slot of slots) {
      // Derive a key from the given password
      const kdf = crypto.scryptSync(
        password,
        Buffer.from(slot.salt, "hex"),
        32,
        { N: slot.n, r: slot.r, p: slot.p, maxmem: 32 * 1024 * 1024 * 2 }
      );

      // Try to use the derived key to decrypt the master key
      const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        kdf,
        Buffer.from(slot.key_params.nonce, "hex")
      );
      decipher.setAuthTag(Buffer.from(slot.key_params.tag, "hex"));

      try {
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(slot.key, "hex")),
          decipher.final(),
        ]);
        masterKey = decrypted;
        break;
      } catch (error: any) {
        if (
          error.message !== "Unsupported state or unable to authenticate data"
        ) {
          throw error;
        }
      }
    }

    if (masterKey === null) {
      throw new Error(
        "error: unable to decrypt the master key with the given password"
      );
    }

    // Decode the base64 vault contents
    const content = Buffer.from(data.db, "base64");

    // Decrypt the vault contents using the master key
    const params = header.params;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      masterKey,
      Buffer.from(params.nonce, "hex")
    );
    decipher.setAuthTag(Buffer.from(params.tag, "hex"));

    const decryptedDb = Buffer.concat([
      decipher.update(content),
      decipher.final(),
    ]);

    return JSON.parse(decryptedDb.toString("utf8")).entries;
  }
}
