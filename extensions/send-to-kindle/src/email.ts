import net from "net";
import tls from "tls";
import os from "os";
import crypto from "crypto";

export type EmailPreferences = {
  kindleEmail?: string;
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpSecurity?: "ssl" | "starttls" | "none";
  smtpUsername?: string;
  smtpPassword?: string;
};

type SendEmailInput = {
  title: string;
  filename: string;
  epubBuffer: Buffer;
  preferences: EmailPreferences;
};

type SmtpSecurity = "ssl" | "starttls" | "none";

type SmtpResponse = {
  code: number;
  lines: string[];
};

type NormalizedEmailPreferences = {
  kindleEmail: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurity;
  smtpUsername: string;
  smtpPassword: string;
};

export async function sendEpubByEmail({ title, filename, epubBuffer, preferences }: SendEmailInput): Promise<void> {
  const settings = normalizePreferences(preferences);
  const message = buildMimeMessage({
    title,
    filename,
    epubBuffer,
    senderEmail: settings.senderEmail,
    kindleEmail: settings.kindleEmail,
  });

  const client = new SmtpClient({
    host: settings.smtpHost,
    port: settings.smtpPort,
    security: settings.smtpSecurity,
  });

  try {
    await client.connect();
    await client.sendEhlo();

    if (settings.smtpSecurity === "starttls") {
      await client.startTls();
      await client.sendEhlo();
    }

    if (settings.smtpUsername && settings.smtpPassword) {
      await client.authLogin(settings.smtpUsername, settings.smtpPassword);
    }

    await client.sendMail({
      from: settings.senderEmail,
      to: settings.kindleEmail,
      message,
    });
  } finally {
    await client.quit();
  }
}

export async function testEmailPreferences(preferences: EmailPreferences): Promise<void> {
  const settings = normalizePreferences(preferences);
  const client = new SmtpClient({
    host: settings.smtpHost,
    port: settings.smtpPort,
    security: settings.smtpSecurity,
  });

  try {
    await client.connect();
    await client.sendEhlo();

    if (settings.smtpSecurity === "starttls") {
      await client.startTls();
      await client.sendEhlo();
    }

    if (settings.smtpUsername && settings.smtpPassword) {
      await client.authLogin(settings.smtpUsername, settings.smtpPassword);
    }

    await client.verifyRecipient(settings.senderEmail, settings.kindleEmail);
  } finally {
    await client.quit();
  }
}

function normalizePreferences(preferences: EmailPreferences): NormalizedEmailPreferences {
  const kindleEmail = preferences.kindleEmail?.trim();
  const senderEmail = preferences.senderEmail?.trim();
  const smtpHost = preferences.smtpHost?.trim();
  const smtpPort = Number(preferences.smtpPort ?? "");
  const smtpSecurity = (preferences.smtpSecurity ?? "ssl") as SmtpSecurity;
  const smtpUsername = preferences.smtpUsername?.trim() || "";
  const smtpPassword = preferences.smtpPassword ?? "";

  const missing: string[] = [];
  if (!kindleEmail) missing.push("Kindle Address");
  if (!senderEmail) missing.push("Sender Address");
  if (!smtpHost) missing.push("SMTP Server");
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) missing.push("SMTP Port");
  if ((smtpUsername && !smtpPassword) || (!smtpUsername && smtpPassword)) {
    missing.push("Complete SMTP credentials");
  }

  if (missing.length > 0) {
    throw new Error(`Incomplete email settings: ${missing.join(", ")}.`);
  }

  return {
    kindleEmail: kindleEmail!,
    senderEmail: senderEmail!,
    smtpHost: smtpHost!,
    smtpPort,
    smtpSecurity,
    smtpUsername,
    smtpPassword,
  };
}

function buildMimeMessage(input: {
  title: string;
  filename: string;
  epubBuffer: Buffer;
  senderEmail: string;
  kindleEmail: string;
}): string {
  const boundary = `raycast-${crypto.randomUUID()}`;
  const subject = encodeHeader(input.title || "Reading");
  const now = new Date().toUTCString();
  const textBody = "Here is your article in EPUB format.";

  const attachmentBase64 = chunkBase64(input.epubBuffer.toString("base64"));
  const { asciiFilename, rfc5987Filename } = encodeFilenameHeader(input.filename || "Article.epub");

  const lines = [
    `Date: ${now}`,
    `From: ${sanitizeHeader(input.senderEmail)}`,
    `To: ${sanitizeHeader(input.kindleEmail)}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    `Content-Type: application/epub+zip; name="${asciiFilename}"; name*=UTF-8''${rfc5987Filename}`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${asciiFilename}"; filename*=UTF-8''${rfc5987Filename}`,
    "",
    attachmentBase64,
    "",
    `--${boundary}--`,
    "",
  ];

  return lines.join("\r\n");
}

function chunkBase64(value: string): string {
  const chunkSize = 76;
  let output = "";
  for (let i = 0; i < value.length; i += chunkSize) {
    output += value.slice(i, i + chunkSize) + "\r\n";
  }
  return output.trimEnd();
}

function encodeHeader(value: string): string {
  if (isAscii(value)) {
    return sanitizeHeader(value);
  }
  const base64 = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${base64}?=`;
}

function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 127) {
      return false;
    }
  }
  return true;
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeFilenameHeader(value: string): { asciiFilename: string; rfc5987Filename: string } {
  const sanitized = sanitizeHeader(value);
  const asciiFilename = toAsciiFilename(sanitized);
  const rfc5987Filename = encodeRFC5987ValueChars(sanitized);
  return { asciiFilename, rfc5987Filename };
}

function toAsciiFilename(value: string): string {
  const normalized = value.normalize("NFKD").replace(/[^\x20-\x7E]+/g, "");
  const cleaned = normalized
    .replace(/["\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "Article.epub";
}

function encodeRFC5987ValueChars(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}

type SmtpClientOptions = {
  host: string;
  port: number;
  security: SmtpSecurity;
  timeoutMs?: number;
};

class SmtpClient {
  private socket: net.Socket | tls.TLSSocket | null = null;
  private buffer = "";
  private currentResponseCode: number | null = null;
  private currentResponseLines: string[] = [];
  private queuedResponses: SmtpResponse[] = [];
  private pending: {
    resolve: (response: SmtpResponse) => void;
    reject: (error: Error) => void;
    expected?: number[];
    timeout: NodeJS.Timeout;
  } | null = null;
  private readonly options: SmtpClientOptions;

  constructor(options: SmtpClientOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const { host, port, security } = this.options;
    this.socket = security === "ssl" ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });

    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => this.handleData(chunk.toString()));
    this.socket.on("error", (error) => this.failPending(error));

    await this.readResponse([220]);
  }

  async sendEhlo(): Promise<void> {
    const hostname = sanitizeHeader(os.hostname() || "raycast");
    await this.sendCommand(`EHLO ${hostname}`, [250]);
  }

  async startTls(): Promise<void> {
    await this.sendCommand("STARTTLS", [220]);
    const current = this.socket;
    if (!current) throw new Error("SMTP connection unavailable.");
    this.socket = tls.connect({ socket: current, servername: this.options.host });
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => this.handleData(chunk.toString()));
    this.socket.on("error", (error) => this.failPending(error));
  }

  async authLogin(username: string, password: string): Promise<void> {
    await this.sendCommand("AUTH LOGIN", [334]);
    await this.sendCommand(Buffer.from(username).toString("base64"), [334]);
    await this.sendCommand(Buffer.from(password).toString("base64"), [235]);
  }

  async sendMail(input: { from: string; to: string; message: string }): Promise<void> {
    await this.sendCommand(`MAIL FROM:<${input.from}>`, [250]);
    await this.sendCommand(`RCPT TO:<${input.to}>`, [250, 251]);
    await this.sendCommand("DATA", [354]);
    await this.sendData(dotStuff(input.message));
    await this.sendCommand(".", [250]);
  }

  async verifyRecipient(from: string, to: string): Promise<void> {
    await this.sendCommand(`MAIL FROM:<${from}>`, [250]);
    await this.sendCommand(`RCPT TO:<${to}>`, [250, 251]);
    await this.sendCommand("RSET", [250]);
  }

  async quit(): Promise<void> {
    try {
      await this.sendCommand("QUIT", [221, 250]);
    } catch {
      // Ignore errors while closing.
    } finally {
      this.socket?.end();
      this.socket?.destroy();
    }
  }

  private async sendCommand(command: string, expected?: number[]): Promise<SmtpResponse> {
    this.write(`${command}\r\n`);
    return this.readResponse(expected);
  }

  private async sendData(data: string): Promise<void> {
    this.write(`${data}\r\n`);
  }

  private write(data: string) {
    if (!this.socket) throw new Error("SMTP connection unavailable.");
    this.socket.write(data);
  }

  private handleData(chunk: string) {
    this.buffer += chunk;
    let index = this.buffer.indexOf("\n");
    while (index !== -1) {
      const rawLine = this.buffer.slice(0, index + 1);
      this.buffer = this.buffer.slice(index + 1);
      const line = rawLine.replace(/\r?\n$/, "");
      this.processLine(line);
      index = this.buffer.indexOf("\n");
    }
  }

  private processLine(line: string) {
    const match = line.match(/^(\d{3})([ -])(.*)$/);
    if (!match) return;
    const code = Number(match[1]);
    const separator = match[2];

    if (this.currentResponseCode === null) {
      this.currentResponseCode = code;
    }
    this.currentResponseLines.push(line);

    if (separator === " ") {
      const response: SmtpResponse = { code, lines: this.currentResponseLines.slice() };
      this.currentResponseCode = null;
      this.currentResponseLines = [];

      if (this.pending) {
        const pending = this.pending;
        this.pending = null;
        clearTimeout(pending.timeout);
        if (pending.expected && !pending.expected.includes(code)) {
          pending.reject(new Error(`Unexpected SMTP response (${code}).`));
          return;
        }
        pending.resolve(response);
      } else {
        this.queuedResponses.push(response);
      }
    }
  }

  private async readResponse(expected?: number[]): Promise<SmtpResponse> {
    if (this.pending) throw new Error("An SMTP response is already pending.");
    const timeoutMs = this.options.timeoutMs ?? 15000;
    return new Promise((resolve, reject) => {
      const existing = this.queuedResponses.shift();
      if (existing) {
        if (expected && !expected.includes(existing.code)) {
          reject(new Error(`Unexpected SMTP response (${existing.code}).`));
          return;
        }
        resolve(existing);
        return;
      }
      const timeout = setTimeout(() => {
        if (this.pending) {
          const pending = this.pending;
          this.pending = null;
          pending.reject(new Error("SMTP connection timed out."));
        }
      }, timeoutMs);
      this.pending = { resolve, reject, expected, timeout };
    });
  }

  private failPending(error: Error) {
    if (!this.pending) return;
    const pending = this.pending;
    this.pending = null;
    clearTimeout(pending.timeout);
    pending.reject(error);
  }
}

function dotStuff(message: string): string {
  return message
    .split(/\r?\n/)
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}
