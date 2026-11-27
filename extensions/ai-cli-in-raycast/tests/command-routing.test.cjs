require('./load.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { storageKeys, ACTIVE_PROVIDER_KEY } = require('../src/session-storage.ts');
const { connectionSignature } = require('../src/setup-state.ts');
const manifest = require('../package.json');

const commands = {
  index: { provider: 'codex', title: 'Codex in Raycast' },
  antigravity: { provider: 'antigravity', title: 'Antigravity in Raycast' },
  qoder: { provider: 'qoder', title: 'Qoder in Raycast' },
  'qoder-cn': { provider: 'qoder-cn', title: 'Qoder CN in Raycast' },
  workbuddy: { provider: 'workbuddy', title: 'WorkBuddy in Raycast' },
  gemini: { provider: 'gemini', title: 'Gemini in Raycast' },
};
const providerIds = new Set(Object.values(commands).map(command => command.provider));
const strategyPreferences = {
  codex: 'codexModelStrategy',
  antigravity: 'agyModelStrategy',
  qoder: 'qoderModelStrategy',
  'qoder-cn': 'qoderCnModelStrategy',
  workbuddy: 'workbuddyModelStrategy',
  gemini: 'geminiModelStrategy',
};

// Execute each real entrypoint and the production default component. Only the
// Raycast host and unrelated UI children are replaced; command-routing.ts and
// ConfiguredCommand's storage/setup logic remain production code.
function commandHost(t, commandName, launch = {}, options = {}) {
  const scopes = new Map();
  let scope, cursor;
  const effects = [];
  const cleanups = [];
  const react = {
    useRef(value) { const i = cursor++; if (!(i in scope)) scope[i] = { current: value }; return scope[i]; },
    useState(value) { const slots = scope; const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useMemo(fn) { cursor++; return fn(); },
    useEffect(fn, deps) { const i = cursor++; if (!scope[i] || deps.some((value, n) => value !== scope[i][n])) { scope[i] = deps; effects.push(fn); } },
  };
  const saved = new Map([[ACTIVE_PROVIDER_KEY, commandName === 'gemini' ? 'codex' : 'gemini']]);
  const preferences = { uiLanguage: 'en', activeProvider: saved.get(ACTIVE_PROVIDER_KEY), ...options.preferences };
  for (const provider of providerIds) {
    const keys = storageKeys(provider);
    const selection = { model: `${provider}-selected-model`, effort: '' };
    saved.set(keys.setup, JSON.stringify({ version: 2, selection, connection: connectionSignature(preferences, provider), checkedAt: 1 }));
    saved.set(keys.model, JSON.stringify(selection));
    saved.set(keys.library, JSON.stringify({ activeId: `${provider}-private-history`, sessions: [{ messages: ['private history'] }] }));
  }
  const reads = [], writes = [], launched = [], toasts = [];
  let launchError;
  const jsx = (type, props, key) => ({ type, props, key });
  const api = {
    environment: { commandName, assetsPath: '/assets' },
    getPreferenceValues: () => preferences,
    LaunchType: { UserInitiated: 'user-initiated' },
    launchCommand: async options => { launched.push(options); if (launchError) throw launchError; },
    showToast: async options => { toasts.push(options); },
    updateCommandMetadata: async () => {},
    Toast: { Style: { Failure: 'failure' } },
    LocalStorage: {
      getItem: async key => { reads.push(key); return saved.get(key); },
      setItem: async (key, value) => { writes.push([key, value]); saved.set(key, value); },
    },
    Detail: 'detail', Action: {}, ActionPanel: {}, List: 'list', Icon: {}, Keyboard: { Shortcut: { Common: {} } },
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const loaded = new Module(filename, module);
    loaded.filename = filename;
    cache.set(filename, loaded);
    loaded.require = id => {
      if (id === 'react') return react;
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === '@raycast/api') return api;
      if (id === './provider') return {
        isProviderId: value => providerIds.has(value),
        PROVIDER_LABELS: { codex: 'Codex', antigravity: 'Antigravity', qoder: 'Qoder', 'qoder-cn': 'Qoder CN', workbuddy: 'WorkBuddy', gemini: 'Gemini' },
      };
      if (id === './setup') return { SetupWizard: 'setup' };
      if (id === './model-settings') return { ModelSettings: 'model-settings' };
      if (id === './provider-menu') return { ProviderMenu: 'providers' };
      if (id === './message-composer') return { MessageComposer: 'composer' };
      if (id === './model-menu') return { ModelMenu: 'models', EffortMenu: 'efforts' };
      if (id === './history') return { useSessionHistory: () => ({}) };
      if (id === './chat-text') return { conversationMarkdown: () => '' };
      if (id.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), id);
        if (fs.existsSync(`${base}.tsx`)) return load(`${base}.tsx`);
        return require(`${base}.ts`);
      }
      return require(id);
    };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, fileName: filename,
    }).outputText;
    loaded._compile(source, filename);
    return loaded.exports;
  }
  const entry = load(path.resolve(__dirname, `../src/${commandName in commands ? commandName : 'index'}.tsx`)).default;
  function render(component, props) {
    if (!scopes.has(component)) scopes.set(component, []);
    scope = scopes.get(component); cursor = 0;
    const tree = component(props);
    for (const effect of effects.splice(0)) cleanups.push(effect());
    return tree;
  }
  const root = () => render(entry, launch);
  t.after(() => { for (const cleanup of cleanups) cleanup?.(); });
  return {
    root, reads, writes, launched, toasts, saved, preferences,
    setLaunchError(value) { launchError = value; },
    async configured() {
      const outer = root();
      render(outer.type, outer.props);
      await new Promise(setImmediate);
      return render(outer.type, outer.props);
    },
  };
}

test('manifest exposes six isolated chats alongside the native hub', () => {
  assert.equal(manifest.title, 'AI CLI in Raycast');
  assert.deepEqual(manifest.commands.filter(command=>command.name!=='cli-hub').map(command => command.name).sort(), Object.keys(commands).sort());
  for (const command of manifest.commands.filter(command=>command.name!=='cli-hub')) {
    assert.equal(command.title, commands[command.name].title);
    assert.equal(command.mode, 'view');
  }
});

for (const [name, expected] of Object.entries(commands)) {
  test(`${expected.title} selects its own provider and setup despite stale active-provider state`, async t => {
    const launch = { arguments: { prompt: `Only for ${expected.provider}` }, fallbackText: '' };
    const host = commandHost(t, name, launch);
    const root = host.root();
    assert.equal(root.props.provider, expected.provider);
    assert.equal(root.props.launch, launch);
    const chat = await host.configured();
    assert.equal(chat.props.provider, expected.provider);
    assert.deepEqual(chat.props.arguments, launch.arguments);
    const keys = storageKeys(expected.provider);
    assert.deepEqual(host.reads, [keys.setup, keys.model, keys.modelPolicy]);
    assert.equal(host.reads.includes(ACTIVE_PROVIDER_KEY), false);
    assert.deepEqual(host.writes, []);
  });

  test(`${expected.title} ignores reselection and invalid provider values`, async t => {
    const host = commandHost(t, name);
    await host.root().props.onProviderChange(expected.provider);
    await host.root().props.onProviderChange('not-a-provider');
    assert.deepEqual(host.launched, []);
    assert.deepEqual(host.toasts, []);
    assert.deepEqual(host.writes, []);
  });

  test(`${expected.title} requires its fixed default after completed setup and reloads the saved pair`, async t => {
    const launch = { arguments: { prompt: 'keep this launch prompt' }, fallbackText: '' };
    const host = commandHost(t, name, launch, {
      preferences: { [strategyPreferences[expected.provider]]: 'fixed' },
    });
    const keys = storageKeys(expected.provider);
    host.saved.set(keys.modelPolicy, JSON.stringify({ mode: 'last', selection: null }));
    const settings = await host.configured();
    assert.equal(settings.type, 'model-settings');
    assert.equal(settings.props.provider, expected.provider);
    assert.equal(typeof settings.props.onSaved, 'function');
    assert.deepEqual(host.writes, []);
    const fixed = { mode: 'fixed', selection: { model: `${expected.provider}-fixed-model`, effort: 'high' } };
    host.saved.set(keys.modelPolicy, JSON.stringify(fixed));
    settings.props.onSaved();
    const chat = await host.configured();
    assert.equal(chat.type.name, 'NativeChat');
    assert.equal(chat.props.provider, expected.provider);
    assert.deepEqual(chat.props.arguments, launch.arguments);
    assert.deepEqual(host.reads, [keys.setup, keys.model, keys.modelPolicy, keys.setup, keys.model, keys.modelPolicy]);
    assert.deepEqual(host.writes, []);
  });

  test(`${expected.title} uses the first explicit setup choice to complete a new fixed strategy`, async t => {
    const host = commandHost(t, name, {}, {
      preferences: { [strategyPreferences[expected.provider]]: 'fixed' },
    });
    const keys = storageKeys(expected.provider);
    host.saved.delete(keys.setup);
    const setup = await host.configured();
    assert.equal(setup.type, 'setup');
    const choice = { model: `${expected.provider}-first-choice`, effort: 'low' };
    const completed = { version: 2, selection: choice, connection: connectionSignature(host.preferences, expected.provider), checkedAt: 2 };
    setup.props.onComplete(completed);
    await new Promise(setImmediate);
    const chat = await host.configured();
    assert.equal(chat.type.name, 'NativeChat');
    assert.equal(chat.props.provider, expected.provider);
    assert.deepEqual(host.writes, [[keys.modelPolicy, JSON.stringify({ mode: 'fixed', selection: choice })]]);
    assert.deepEqual(JSON.parse(host.saved.get(keys.modelPolicy)), { mode: 'fixed', selection: choice });
    assert.deepEqual(host.toasts, []);
  });

  test(`${expected.title} ignores other CLIs' native strategies and remounts only for its own strategy`, async t => {
    const preferences = Object.fromEntries(
      Object.entries(strategyPreferences).filter(([provider]) => provider !== expected.provider).map(([, key]) => [key, 'fixed']),
    );
    const host = commandHost(t, name, {}, { preferences });
    const initialKey = host.root().key;
    const chat = await host.configured();
    assert.equal(chat.type.name, 'NativeChat');
    assert.equal(chat.props.provider, expected.provider);
    for (const [provider, key] of Object.entries(strategyPreferences)) {
      if (provider !== expected.provider) host.preferences[key] = 'last';
    }
    assert.equal(host.root().key, initialKey);
    host.preferences[strategyPreferences[expected.provider]] = 'fixed';
    const fixedKey = host.root().key;
    assert.notEqual(fixedKey, initialKey);
    host.preferences[strategyPreferences[expected.provider]] = 'last';
    assert.notEqual(host.root().key, fixedKey);
    assert.deepEqual(host.writes, []);
  });
}

test('cross-command switching delegates to Raycast without forwarding arguments, context, or history', async t => {
  for (const [name, current] of Object.entries(commands)) {
    const launch = { arguments: { prompt: 'private source prompt' }, fallbackText: 'private fallback', launchContext: { threadId: 'private-source-thread', draft: 'private draft' } };
    const host = commandHost(t, name, launch);
    const source = host.root();
    for (const [target, other] of Object.entries(commands)) {
      if (target === name) continue;
      await source.props.onProviderChange(other.provider);
      assert.deepEqual(host.launched.at(-1), { name: target, type: 'user-initiated' });
      assert.equal(host.root().props.provider, current.provider);
    }
    assert.deepEqual(host.writes, []);
    assert.deepEqual(host.reads, []);
    assert.deepEqual(host.toasts, []);
  }
});

test('host rejection of a disabled command is reported and preserves the current command', async t => {
  const host = commandHost(t, 'index', { arguments: { prompt: 'private prompt' } });
  host.setLaunchError(new Error('The command is disabled'));
  await assert.doesNotReject(host.root().props.onProviderChange('gemini'));
  assert.deepEqual(host.launched, [{ name: 'gemini', type: 'user-initiated' }]);
  assert.equal(host.toasts.length, 1);
  assert.equal(host.toasts[0].style, 'failure');
  assert.equal(host.toasts[0].title, 'Could Not Switch CLI');
  assert.match(host.toasts[0].message, /disabled/);
  assert.match(host.toasts[0].message, /Raycast Settings.*Extensions.*AI CLI in Raycast/);
  assert.equal(host.root().props.provider, 'codex');
  assert.deepEqual(host.writes, []);
});

test('unknown root command fails explicitly instead of opening a stale provider', t => {
  const host = commandHost(t, 'unknown-command');
  assert.throws(() => host.root(), /Unknown AI in Raycast command/);
  assert.deepEqual(host.reads, []);
  assert.deepEqual(host.launched, []);
});
