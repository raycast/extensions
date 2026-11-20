import { test } from "node:test";
import { equal, fail, rejects } from "node:assert/strict";
import { createServer } from "node:net";
import type { Server, Socket } from "node:net";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSecureContext, TLSSocket } from "node:tls";
import { Client } from "ldapts";
import {
  connectionHost,
  formatTargetHost,
  startTLSWithDeadline,
  tlsOptions,
} from "../src/ldap";

// Compiled tests land in dist-tests/tests; the fixtures stay at the source tree.
const fixturesDir = join(__dirname, "..", "..", "tests", "fixtures");

// LDAPMessage (messageID placeholder) carrying an extendedResp: success (0),
// empty matchedDN and errorMessage, responseName 1.3.6.1.4.1.1466.20037
// (StartTLS). The protocolOp tag is 0x78 because ldapts maps
// LDAP_RES_EXTENSION to APPLICATION 24 rather than the RFC 4511 value 25.
const STARTTLS_SUCCESS_TEMPLATE = Buffer.from(
  "301a02010178150a0100040004008a0c060a2b060104018b3a819c45",
  "hex",
);

function startTlsSuccess(request: Buffer): Buffer {
  // Echo the request's messageID: INTEGER value sits right after the
  // LDAPMessage SEQUENCE header (30 LL 02 01 <id>).
  equal(request[2], 0x02);
  const response = Buffer.from(STARTTLS_SUCCESS_TEMPLATE);
  response[4] = request[4];
  return response;
}

async function listen(server: Server): Promise<number> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return (server.address() as { port: number }).port;
}

async function closeServer(server: Server, sockets: Set<Socket>): Promise<void> {
  for (const socket of sockets) socket.destroy();
  const closed = once(server, "close");
  server.close();
  await closed;
}

test("host normalization wraps bare IPv6 literals for URLs and unwraps them for TLS", () => {
  equal(formatTargetHost("::1"), "[::1]");
  equal(formatTargetHost("[::1]"), "[::1]");
  equal(formatTargetHost(" 2001:db8::1 "), "[2001:db8::1]");
  equal(formatTargetHost("dc01.example.com"), "dc01.example.com");
  equal(connectionHost("[::1]"), "::1");
  equal(connectionHost("::1"), "::1");
  equal(connectionHost("dc01.example.com"), "dc01.example.com");
});

test("tls options carry the configured host for certificate verification", () => {
  const options = tlsOptions(
    { ldapSecurity: "starttls", ldapTLSVerify: true },
    "127.0.0.1",
  );
  if (!options) {
    fail("expected TLS options for starttls security");
  }
  equal(options.host, "127.0.0.1");
  equal(options.rejectUnauthorized, true);
  equal(
    tlsOptions({ ldapSecurity: "starttls", ldapTLSVerify: false }, "127.0.0.1")
      ?.rejectUnauthorized,
    false,
  );
  equal(tlsOptions({ ldapSecurity: "none" }, "127.0.0.1"), undefined);
});

test("StartTLS verifies a certificate with an IP SAN against the configured host", { timeout: 15000 }, async () => {
  const certPath = join(fixturesDir, "localhost-ip-san.pem");
  const key = readFileSync(join(fixturesDir, "localhost-ip-san-key.pem"));
  const cert = readFileSync(certPath);
  const secureContext = createSecureContext({ key, cert });

  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.once("data", (request: Buffer) => {
      socket.write(startTlsSuccess(request));
      const tlsSocket = new TLSSocket(socket, {
        isServer: true,
        secureContext,
      });
      tlsSocket.on("error", () => {});
    });
  });
  const port = await listen(server);

  const options = tlsOptions(
    {
      ldapSecurity: "starttls",
      ldapTLSVerify: true,
      ldapCACert: certPath,
    },
    "127.0.0.1",
  );
  if (!options) {
    fail("expected TLS options for starttls security");
  }
  equal(options.host, "127.0.0.1");

  const client = new Client({
    url: `ldap://127.0.0.1:${port}`,
    timeout: 5000,
    connectTimeout: 5000,
  });
  try {
    // Without the host in the TLS options, Node verifies the certificate
    // against "localhost" and this rejects with ERR_TLS_CERT_ALTNAME_INVALID.
    await startTLSWithDeadline(client, options, 5000);
  } finally {
    client.unbind().catch(() => {});
    await closeServer(server, sockets);
  }
});

test("a StartTLS handshake that stalls after the upgrade acknowledgement times out", { timeout: 15000 }, async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on("error", () => {});
    socket.once("data", (request: Buffer) => {
      socket.write(startTlsSuccess(request));
      // …and then silence: the TLS handshake never completes.
    });
  });
  const port = await listen(server);

  const client = new Client({
    url: `ldap://127.0.0.1:${port}`,
    timeout: 5000,
    connectTimeout: 5000,
  });
  try {
    const startedAt = Date.now();
    await rejects(
      startTLSWithDeadline(client, { rejectUnauthorized: false }, 500),
      /StartTLS handshake timed out after 500 ms/,
    );
    if (!(Date.now() - startedAt < 4500)) {
      fail("deadline must fire before the client's operation timeouts");
    }
  } finally {
    client.unbind().catch(() => {});
    await closeServer(server, sockets);
  }
});
