const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture() {
  let origin = 'https://luckynote.io';
  const credentials = new Map();
  const calls = [];
  const removed = [];
  const responses = [];
  const exports = {};
  class Client {
    constructor(options) { this.id = options.providerId; }
    async getTokens() { return credentials.get(this.id); }
    async setTokens(tokens) { credentials.set(this.id, tokens); }
    async removeTokens() { credentials.delete(this.id); }
    async authorizationRequest(options) {
      return { ...options, codeVerifier: 'proof-from-raycast', redirectURI: 'https://raycast.com/redirect?packageName=Extension' };
    }
    async authorize() { return { authorizationCode: 'one-time-code' }; }
  }
  const api = {
    getPreferenceValues: () => ({ serverUrl: origin }),
    LocalStorage: { removeItem: async key => removed.push(key) },
    OAuth: { PKCEClient: Client, RedirectMethod: { Web: 'web' } },
  };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/lib/api.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  vm.runInNewContext(code, {
    exports, require: name => { assert.equal(name, '@raycast/api'); return api; }, URL, AbortSignal,
    fetch: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); assert.ok(responses.length, 'Unexpected fetch'); return responses.shift(); }
  });
  return { api: exports, calls, removed, setOrigin: value => { origin = value; },
    respond: (data, headers = {}, status = 200) => responses.push({ ok: status < 400, status, headers: new Headers(headers), json: async () => data }) };
}

test('connect exchanges PKCE proof and securely replaces legacy credentials', async () => {
  const f = fixture();
  f.respond({ data: { exchangeExtensionAuthCode: { __typename: 'AuthPayload', token: 'access', refreshToken: 'refresh' } } });
  await f.api.connect();
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].body.variables.data)), {
    extensionId: 'raycast', code: 'one-time-code', codeVerifier: 'proof-from-raycast', redirectUri: 'https://raycast.com/redirect?packageName=Extension'
  });
  assert.equal((await f.api.authClient().getTokens()).accessToken, 'access');
  assert.deepEqual(f.removed, ['accessToken', 'refreshToken', 'homeFolder']);
});

test('persists renewed access tokens while retaining refresh tokens', async () => {
  const f = fixture();
  await f.api.authClient().setTokens({ accessToken: 'old', refreshToken: 'refresh' });
  f.respond({ data: { me: { id: 'user', homeFolder: 'inbox' } } }, { 'x-token': 'renewed' });
  await f.api.getAccount();
  assert.equal(f.calls[0].headers['x-refresh-token'], 'refresh');
  assert.equal((await f.api.authClient().getTokens()).accessToken, 'renewed');
  assert.equal((await f.api.authClient().getTokens()).refreshToken, 'refresh');
});

test('invalid sessions disconnect without retrying writes', async () => {
  const f = fixture();
  await f.api.authClient().setTokens({ accessToken: 'expired' });
  f.respond({ errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] });
  await assert.rejects(f.api.saveMessage('inbox', 'note'), /expired/);
  assert.equal(f.calls.length, 1);
  assert.equal(await f.api.authClient().getTokens(), undefined);
});

test('sessions are isolated by server origin and reject insecure destinations', async () => {
  const f = fixture();
  await f.api.authClient().setTokens({ accessToken: 'production' });
  f.setOrigin('http://localhost:4000');
  assert.equal(await f.api.authClient().getTokens(), undefined);
  await assert.rejects(f.api.getAccount(), /Save Message/);
  assert.equal(f.calls.length, 0);
  for (const url of ['http://remote.example', 'https://user:password@example.com', 'https://example.com/path']) {
    f.setOrigin(url); assert.throws(f.api.serverUrl);
  }
});

test('folder search and task saves use the current GraphQL contract', async () => {
  const f = fixture();
  await f.api.authClient().setTokens({ accessToken: 'access' });
  f.respond({ data: { findFolders: { folders: [] } } });
  await f.api.getFolders('work');
  assert.equal(f.calls[0].body.variables.data.text, 'work');
  assert.equal(f.calls[0].body.variables.data.count, 50);
  f.respond({ data: { createMessage: { id: 'saved' } } });
  await f.api.saveMessage('selected-folder', '- task', 'body');
  const input = f.calls[1].body.variables.data;
  assert.equal(input.folderId, 'selected-folder');
  assert.equal(input.content.title, 'task');
  assert.equal(input.content.isCheckbox, true);
  await assert.rejects(f.api.saveMessage('inbox', ' - '), /title/);
  assert.equal(f.calls.length, 2);
});

test('localhost web authorization uses the local API on port 4000', async () => {
  const f = fixture();
  f.setOrigin('http://localhost:3000');
  assert.equal(f.api.serverUrl(), 'http://localhost:3000');
  assert.equal(f.api.apiUrl(), 'http://localhost:4000');
  f.respond({ data: { exchangeExtensionAuthCode: { __typename: 'AuthPayload', token: 'local-access', refreshToken: 'local-refresh' } } });
  await f.api.connect();
  assert.equal(f.calls[0].url, 'http://localhost:4000/graphql');
  assert.equal((await f.api.authClient().getTokens()).accessToken, 'local-access');
  f.setOrigin('https://luckynote.io');
  assert.equal(f.api.apiUrl(), 'https://luckynote.io');
  assert.equal(await f.api.authClient().getTokens(), undefined);
});
