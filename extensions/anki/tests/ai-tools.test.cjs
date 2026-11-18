const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness({
  request = async () => [],
  add = async () => 42,
  update = async () => {},
  models = [],
} = {}) {
  const calls = [];
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });
    vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename })(
      name => {
        if (name === '@raycast/api') return {};
        if (name.endsWith('/ankiClient'))
          return {
            ankiReq: async (...args) => {
              calls.push(args);
              return request(...args);
            },
          };
        if (name.endsWith('/noteActions'))
          return { default: { addNote: add, updateNote: update }, __esModule: true };
        if (name.endsWith('/modelActions'))
          return { default: { getModels: async () => models }, __esModule: true };
        if (name.startsWith('.'))
          return load(
            path.relative(
              path.resolve(__dirname, '..'),
              path.resolve(path.dirname(filename), `${name}.ts`)
            )
          );
        return require(name);
      },
      module,
      module.exports
    );
    cache.set(filename, module.exports);
    return module.exports;
  }
  return { load, calls };
}
const note = {
  noteId: 42,
  modelName: 'Custom',
  tags: ['old'],
  cards: [99],
  fields: { Answer: { value: 'a', order: 1 }, Prompt: { value: 'q', order: 0 } },
  privateFunction: () => {},
};
const model = {
  name: 'Custom',
  type: 0,
  flds: [
    { name: 'Answer', ord: 1, description: '' },
    { name: 'Prompt', ord: 0, description: '' },
  ],
  tmpls: [{ name: 'Forward', ord: 0 }],
  privateFunction: () => {},
};
const createInput = {
  deckName: 'Test',
  modelName: 'Custom',
  fields: [{ name: 'Prompt', value: 'q' }],
  tags: ['new_tag'],
};
const readCreate = async action => (action === 'deckNames' ? ['Test'] : [model]);

test('note and model projections are structured-cloneable and ordered without leaking raw data', async () => {
  const h = harness({ request: async () => [note], models: [model] });
  const result = await h.load('src/tools/get-note.ts').default({ noteId: 42 });
  assert.deepEqual(structuredClone(result), {
    noteId: 42,
    modelName: 'Custom',
    fields: [
      { name: 'Prompt', value: 'q' },
      { name: 'Answer', value: 'a' },
    ],
    tags: ['old'],
    cardIds: [99],
  });
  const types = await h.load('src/tools/list-note-types.ts').default();
  assert.deepEqual(
    structuredClone(types)[0].fields.map(f => f.name),
    ['Prompt', 'Answer']
  );
  assert.equal(Object.hasOwn(types[0], 'privateFunction'), false);
});

test('search limits details to a sorted page and keeps continuation when notes vanish', async () => {
  const h = harness({
    request: async action => (action === 'findNotes' ? [50, 42, 30, 10] : [{}, note]),
  });
  const result = await h
    .load('src/tools/search-notes.ts')
    .default({ query: 'tag:test', offset: 1, limit: 2 });
  assert.deepEqual(h.calls, [
    ['findNotes', { query: 'tag:test' }],
    ['notesInfo', { notes: [30, 42] }],
  ]);
  assert.equal(result.total, 4);
  assert.equal(result.nextOffset, 3);
  assert.equal(result.hasMore, true);
  assert.deepEqual(
    result.notes.map(n => n.noteId),
    [42]
  );
  structuredClone(result);
});

for (const input of [
  { query: '', limit: 51 },
  { query: '', offset: -1 },
  { query: '', limit: 0 },
  { query: '', offset: 0.5 },
]) {
  test(`invalid search bounds fail before calls ${JSON.stringify(input)}`, async () => {
    const h = harness();
    await assert.rejects(h.load('src/tools/search-notes.ts').default(input));
    assert.equal(h.calls.length, 0);
  });
}

test('missing note is a clear error, not a blank object', async () => {
  const h = harness({ request: async () => [{}] });
  await assert.rejects(h.load('src/tools/get-note.ts').default({ noteId: 42 }), /no longer exists/);
});

test('create confirmation matches all saved fields and tags, with no write or read after saving', async () => {
  const writes = [];
  const h = harness({
    request: readCreate,
    add: async payload => {
      writes.push(payload);
      return 123;
    },
  });
  const tool = h.load('src/tools/create-note.ts');
  const confirmation = await tool.confirmation(createInput);
  assert.equal(writes.length, 0);
  assert.deepEqual(confirmation.info, [
    { name: 'Deck', value: 'Test' },
    { name: 'Note Type', value: 'Custom' },
    { name: 'Prompt', value: 'q' },
    { name: 'Answer', value: '(empty)' },
    { name: 'Tags', value: 'new_tag' },
  ]);
  const result = await tool.default(createInput);
  assert.deepEqual(structuredClone(result), {
    status: 'saved',
    noteId: 123,
    deckName: 'Test',
    modelName: 'Custom',
  });
  assert.deepEqual(writes[0].fields, { Prompt: 'q', Answer: '' });
  assert.deepEqual(writes[0].tags, ['new_tag']);
  assert.equal(h.calls.length, 4);
});

for (const fields of [
  [{ name: 'Wrong', value: 'x' }],
  [
    { name: 'Prompt', value: 'a' },
    { name: 'Prompt', value: 'b' },
  ],
  [],
]) {
  test(`create rejects invalid fields ${JSON.stringify(fields)}`, async () => {
    let writes = 0;
    const h = harness({
      request: readCreate,
      add: async () => {
        writes++;
      },
    });
    await assert.rejects(h.load('src/tools/create-note.ts').default({ ...createInput, fields }));
    assert.equal(writes, 0);
  });
}

test('special field names stay own properties', () => {
  const h = harness();
  const fields = h
    .load('src/tools/note-utils.ts')
    .fieldsRecord([{ name: '__proto__', value: 'value' }]);
  assert.equal(Object.hasOwn(fields, '__proto__'), true);
  assert.equal(fields.__proto__, 'value');
});

test('update preserves omitted fields and tags and supports explicitly clearing tags', async () => {
  const writes = [];
  const h = harness({ request: async () => [note], update: async payload => writes.push(payload) });
  const tool = h.load('src/tools/update-note.ts');
  await tool.default({ noteId: 42, fields: [{ name: 'Answer', value: 'new' }] });
  await tool.default({ noteId: 42, tags: [] });
  assert.deepEqual(writes, [
    { id: 42, fields: { Answer: 'new' } },
    { id: 42, tags: [] },
  ]);
  const confirmation = await tool.confirmation({
    noteId: 42,
    fields: [{ name: 'Answer', value: '' }],
    tags: [],
  });
  assert.deepEqual(confirmation.info, [
    { name: 'Note ID', value: '42' },
    { name: 'Answer', value: '(empty)' },
    { name: 'Replace Tags', value: '(remove all tags)' },
  ]);
  assert.equal(writes.length, 2);
});

test('malformed tag input fails before update', async () => {
  let writes = 0;
  const h = harness({ request: async () => [note], update: async () => writes++ });
  await assert.rejects(
    h.load('src/tools/update-note.ts').default({ noteId: 42, tags: ['two words'] }),
    /without spaces/
  );
  assert.equal(writes, 0);
});

test('uncertain writes return a cloneable uncertain result and never retry', async () => {
  const h = harness({ request: readCreate });
  const { AnkiUncertainError } = h.load('src/error/AnkiError.ts');
  const { mutationResult } = h.load('src/tools/note-utils.ts');
  let writes = 0;
  const result = await mutationResult(async () => {
    writes++;
    throw new AnkiUncertainError('addNote', new Error('reset'));
  });
  assert.equal(writes, 1);
  assert.equal(result.status, 'uncertain');
  assert.match(result.message, /Check Anki before trying again/);
  structuredClone(result);
});

test('partial update errors retain uncertainty and backend reason', async () => {
  const h = harness();
  const { AnkiError } = h.load('src/error/AnkiError.ts');
  const { mutationResult } = h.load('src/tools/note-utils.ts');
  const result = await mutationResult(async () => {
    throw new AnkiError('Some fields saved; tag failure', 'updateNote');
  });
  assert.equal(result.status, 'uncertain');
  assert.match(result.message, /tag failure/);
});

test('omitted custom fields named like Object properties remain empty', async () => {
  const unusualModel = {
    ...model,
    flds: [
      ...model.flds,
      { name: 'toString', ord: 2 },
      { name: 'constructor', ord: 3 },
      { name: '__proto__', ord: 4 },
    ],
  };
  let saved;
  const h = harness({
    request: async action => (action === 'deckNames' ? ['Test'] : [unusualModel]),
    add: async value => {
      saved = value;
      return 123;
    },
  });
  await h.load('src/tools/create-note.ts').default(createInput);
  assert.equal(saved.fields.toString, '');
  assert.equal(saved.fields.constructor, '');
  assert.equal(saved.fields.__proto__, '');
  structuredClone(saved);
});
