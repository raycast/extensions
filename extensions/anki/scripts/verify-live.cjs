const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const port = process.env.ANKI_PORT || '8765';
const modules = new Map();

function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const evaluate = vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
    filename: file,
  });
  evaluate(
    name => {
      if (name === '@raycast/api') {
        return {
          getPreferenceValues: () => ({ port, allow_dup_cards: false, dup_scope: 'deck' }),
          Color: {},
          List: {},
        };
      }
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), `${name}.ts`));
      return require(name);
    },
    module,
    module.exports
  );
  return module.exports;
}

async function request(action, params = {}) {
  const response = await fetch(`http://127.0.0.1:${port}`, {
    method: 'POST',
    body: JSON.stringify({ action, params, version: 6 }),
    signal: AbortSignal.timeout(5000),
  });
  const { result, error } = await response.json();
  if (error) throw new Error(error);
  return result;
}

async function main() {
  assert.equal(await request('version'), 6);
  const tools = Object.fromEntries(
    [
      'list-decks',
      'list-note-types',
      'search-notes',
      'get-note',
      'create-note',
      'update-note',
      'create-deck',
    ].map(name => [name, load(path.join(root, 'src/tools', `${name}.ts`))])
  );
  const deckName = `Raycast AI Verification ${Date.now()}`;
  const modelName = `${deckName} Custom`;
  await request('createModel', {
    modelName,
    inOrderFields: ['Prompt', 'Answer', 'Optional'],
    cardTemplates: [{ Name: 'Forward', Front: '{{Prompt}}', Back: '{{FrontSide}}<hr>{{Answer}}' }],
  });
  const deck = await tools['create-deck'].default({ name: deckName });
  assert.equal(deck.status, 'saved');
  assert((await tools['list-decks'].default()).some(item => item.name === deckName));
  const model = (await tools['list-note-types'].default()).find(item => item.name === modelName);
  assert.deepEqual(
    model.fields.map(field => field.name),
    ['Prompt', 'Answer', 'Optional']
  );
  const input = {
    deckName,
    modelName,
    fields: [
      { name: 'Prompt', value: 'Live AI tool verification' },
      { name: 'Answer', value: '<b>Initial answer</b>' },
    ],
    tags: ['raycast_verification'],
  };
  const preview = await tools['create-note'].confirmation(input);
  assert(preview.info.some(item => item.name === 'Optional' && item.value === '(empty)'));
  const created = await tools['create-note'].default(input);
  assert.equal(created.status, 'saved');
  assert(Number.isSafeInteger(created.noteId));
  assert.deepEqual(structuredClone(created), created);
  await assert.rejects(tools['create-note'].default(input), /duplicate/i);
  const query = `deck:"${deckName}"`;
  const page = await tools['search-notes'].default({ query, limit: 1 });
  assert.equal(page.total, 1);
  assert.equal(page.notes[0].noteId, created.noteId);
  assert.equal(page.hasMore, false);
  const update = {
    noteId: created.noteId,
    fields: [{ name: 'Answer', value: '<b>Updated through the AI tool</b>' }],
    tags: ['raycast_verification', 'new::tag'],
  };
  const updatePreview = await tools['update-note'].confirmation(update);
  assert(
    updatePreview.info.some(item => item.name === 'Answer' && item.value === update.fields[0].value)
  );
  assert.equal((await tools['update-note'].default(update)).status, 'saved');
  const note = await tools['get-note'].default({ noteId: created.noteId });
  assert.deepEqual(structuredClone(note), note);
  assert.equal(note.fields.find(field => field.name === 'Prompt').value, input.fields[0].value);
  assert.equal(note.fields.find(field => field.name === 'Answer').value, update.fields[0].value);
  assert.equal(note.fields.find(field => field.name === 'Optional').value, '');
  assert.deepEqual(note.tags.sort(), update.tags.sort());
  await assert.rejects(
    tools['update-note'].default({
      noteId: created.noteId,
      fields: [{ name: 'Typo', value: 'ignored?' }],
    }),
    /Unknown field/
  );
  assert.equal(
    (await tools['update-note'].default({ noteId: created.noteId, tags: [] })).status,
    'saved'
  );
  assert.deepEqual((await tools['get-note'].default({ noteId: created.noteId })).tags, []);
  assert.equal(
    (await tools['update-note'].default({ noteId: created.noteId, tags: ['raycast_verification'] }))
      .status,
    'saved'
  );
  console.log(
    JSON.stringify(
      { verified: true, deckName, modelName, noteId: created.noteId, tools: Object.keys(tools) },
      null,
      2
    )
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
