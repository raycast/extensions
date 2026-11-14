import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { test } from "node:test";
import {
  Association,
  MacPassClient,
  Transport,
  WireResponse,
  decrypt,
  encrypt,
  localTransport,
  parsePort,
  titleLookupUrl,
} from "../src/lib/protocol";

const association: Association = {
  id: "Raycast",
  key: Buffer.alloc(32, 7).toString("base64"),
  hash: "test-database",
};

function reply(type: string, a = association): WireResponse {
  const nonce = randomBytes(16).toString("base64");
  return {
    RequestType: type,
    Success: true,
    Hash: a.hash,
    Id: a.id,
    Nonce: nonce,
    Verifier: encrypt(nonce, a.key, nonce),
  };
}

function assertRequest(body: Record<string, unknown>, a = association) {
  assert.equal(body.Id, a.id);
  assert.equal(
    decrypt(body.Verifier as string, a.key, body.Nonce as string),
    body.Nonce,
  );
}

test("pairing uses a fresh 256-bit key and verifies the server before storing it", async () => {
  const keys = new Set<string>();
  const client = new MacPassClient(async (body, timeout) => {
    if (body.RequestType === "test-associate")
      return {
        RequestType: "test-associate",
        Hash: association.hash,
        Success: false,
      };
    assert.equal(timeout, 120_000);
    const key = body.Key as string;
    assert.equal(Buffer.from(key, "base64").length, 32);
    assert.equal(
      decrypt(body.Verifier as string, key, body.Nonce as string),
      body.Nonce,
    );
    keys.add(key);
    return reply("associate", { ...association, key });
  });
  const hash = await client.databaseHash();
  assert.equal((await client.associate(hash)).id, "Raycast");
  await client.associate(hash);
  assert.equal(keys.size, 2);
});

test("pairing denial and a database switch fail without returning an association", async () => {
  await assert.rejects(
    new MacPassClient(async () => ({
      ...reply("associate"),
      Success: false,
    })).associate(association.hash),
    /not approved/,
  );
  await assert.rejects(
    new MacPassClient(async (body) =>
      reply("associate", {
        ...association,
        key: body.Key as string,
        hash: "another-database",
      }),
    ).associate(association.hash),
    /verify/,
  );
});

test("search returns only metadata even if the server includes passwords", async () => {
  const nonces = new Set<string>();
  const client = new MacPassClient(async (body) => {
    assertRequest(body);
    nonces.add(body.Nonce as string);
    assert.equal(body.RequestType, "get-all-logins");
    assert.equal(
      decrypt(body.Url as string, association.key, body.Nonce as string),
      "https://raycast.local",
    );
    const response = reply("get-all-logins");
    const enc = (v: string) => encrypt(v, association.key, response.Nonce!);
    response.Entries = [
      {
        Uuid: enc("uuid-1"),
        Name: enc("Example"),
        Login: enc("alice"),
        Password: enc("secret-not-in-results"),
      },
    ];
    return response;
  });
  assert.deepEqual(await client.entries(association), [
    { uuid: "uuid-1", name: "Example", login: "alice" },
  ]);
  await client.entries(association);
  assert.equal(nonces.size, 2);
});

test("password lookup selects the exact UUID among duplicate titles", async () => {
  const name = "銀行 / Login: 🔑";
  const client = new MacPassClient(async (body) => {
    assertRequest(body);
    assert.equal(body.RequestType, "get-logins");
    assert.equal(
      decrypt(body.Url as string, association.key, body.Nonce as string),
      titleLookupUrl(name),
    );
    const response = reply("get-logins");
    const enc = (v: string) => encrypt(v, association.key, response.Nonce!);
    response.Entries = [
      {
        Uuid: enc("wrong-entry"),
        Name: enc(name),
        Login: enc("alice"),
        Password: enc("wrong-password"),
      },
      {
        Uuid: enc("right-entry"),
        Name: enc(name),
        Login: enc("bob"),
        Password: enc("right-password"),
      },
    ];
    return response;
  });
  assert.equal(
    await client.password(association, {
      uuid: "right-entry",
      name,
      login: "bob",
    }),
    "right-password",
  );
  await assert.rejects(
    client.password(association, { uuid: "missing", name, login: "bob" }),
    /not found/,
  );
});

test("invalid verifiers, changed databases, and changed connection IDs are rejected", async () => {
  const badResponses = [
    {
      ...reply("test-associate"),
      Verifier: encrypt(
        "wrong nonce",
        association.key,
        randomBytes(16).toString("base64"),
      ),
    },
    { ...reply("test-associate"), Hash: "other-database" },
    { ...reply("test-associate"), Id: "other-client" },
    { ...reply("test-associate"), Nonce: "" },
  ];
  for (const response of badResponses)
    await assert.rejects(
      new MacPassClient(async () => response).validate(association),
    );
});

test("revoked associations do not return cached credentials", async () => {
  const client = new MacPassClient(async () => ({
    RequestType: "get-logins",
    Hash: association.hash,
    Success: false,
  }));
  await assert.rejects(
    client.password(association, {
      uuid: "x",
      name: "Example",
      login: "alice",
    }),
    /authorize/,
  );
});

test("title lookup preserves Unicode and delimiters and rejects an empty title", () => {
  const title = "銀行 / Login: 🔑";
  assert.equal(decodeURIComponent(titleLookupUrl(title).slice(7)), title);
  assert.throws(() => titleLookupUrl(""), /title/);
});

test("port validation allows only numeric local ports", () => {
  assert.equal(parsePort("19455"), 19455);
  for (const value of ["0", "65536", "1.5", "19455/path", "example.com", ""])
    assert.throws(() => parsePort(value));
});

test("HTTP transport handles locked databases, malformed responses, and deadlines", async () => {
  let mode = "locked";
  const server = createServer((req, res) => {
    req.resume();
    if (mode === "timeout") return;
    res.statusCode = mode === "locked" ? 400 : 200;
    res.end(
      mode === "malformed"
        ? "not-json"
        : JSON.stringify({
            RequestType: "wrong-type",
            Success: false,
            Hash: "x",
          }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const send: Transport = localTransport(address.port);
    await assert.rejects(send({ RequestType: "test-associate" }), /unlock/);
    mode = "malformed";
    await assert.rejects(
      send({ RequestType: "test-associate" }),
      /Invalid response/,
    );
    mode = "mismatch";
    await assert.rejects(
      send({ RequestType: "test-associate" }),
      /Invalid response/,
    );
    mode = "timeout";
    await assert.rejects(
      send({ RequestType: "test-associate" }, 20),
      /did not respond/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
