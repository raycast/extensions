const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function fixture(connected = false, expires = false) {
  const launches = [];
  const saves = [];
  const notifications = [];
  const exports = {};
  const modules = {
    '@raycast/api': {
      LaunchType: { UserInitiated: 'user' },
      launchCommand: async options => launches.push(options),
      showHUD: async message => notifications.push(message),
      showToast: async options => notifications.push(options),
      Toast: { Style: { Failure: 'failure' } },
    },
    './lib/api': {
      authClient: () => ({ getTokens: async () => connected ? { accessToken: 'session' } : undefined }),
      getAccount: async () => {
        if (expires) { connected = false; throw new Error('Session expired'); }
        return { homeFolder: 'inbox' };
      },
      saveMessage: async (...args) => saves.push(args),
    },
  };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/quick-note.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name] });
  return { run: note => exports.default({ arguments: { note } }), launches, saves, notifications };
}

test('signed-out quick capture opens the editor with the complete note', async () => {
  const f = fixture();
  const note = '- Remember this\nwith details';
  await f.run(note);
  assert.equal(f.launches.length, 1);
  assert.equal(f.launches[0].name, 'save-message');
  assert.equal(f.launches[0].context.note, note);
  assert.equal(f.saves.length, 0);
});

test('connected quick capture still saves directly to Inbox', async () => {
  const f = fixture(true);
  await f.run('Quick thought');
  assert.equal(f.launches.length, 0);
  assert.deepEqual(f.saves, [['inbox', 'Quick thought']]);
});

test('an expired session preserves the quick note in the connection editor', async () => {
  const f = fixture(true, true);
  await f.run('Keep my note');
  assert.equal(f.launches[0].name, 'save-message');
  assert.equal(f.launches[0].context.note, 'Keep my note');
  assert.equal(f.saves.length, 0);
});
