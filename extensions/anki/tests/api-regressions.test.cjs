const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { AxiosError } = require('axios');

function loadSource(filename, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const evaluate = vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, {
    filename,
  });
  evaluate(
    name => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    module,
    module.exports
  );
  return module.exports;
}

const { AnkiError, AnkiUncertainError } = loadSource('src/error/AnkiError.ts');
function clientHarness(post) {
  const calls = [];
  const delays = [];
  const { ankiReq } = loadSource('src/api/ankiClient.ts', {
    './axios': {
      post: async (...args) => {
        calls.push(args);
        return post(...args);
      },
    },
    '../util': {
      delay: async ms => {
        delays.push(ms);
      },
    },
    '../error/AnkiError': { AnkiError, AnkiUncertainError },
  });
  return { ankiReq, calls, delays };
}
function cardActions(ankiReq) {
  return loadSource('src/api/cardActions.ts', {
    './ankiClient': { ankiReq },
    '../error/AnkiError': { AnkiError, AnkiUncertainError },
    '../util': { delay: async () => {} },
  }).default;
}

test('a rejected card answer must not report success', async () => {
  await assert.rejects(cardActions(async () => [false]).answerCard(123, 3), /123|answer|grade/i);
});

test('an ambiguous addNote write must not be retried', async () => {
  const h = clientHarness(async () => {
    throw new AxiosError('socket reset', 'ECONNRESET');
  });
  await assert.rejects(h.ankiReq('addNote', { note: {} }), /may have|unknown|could not confirm/i);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.delays, []);
});

for (const action of [
  'addNote',
  'answerCards',
  'createDeck',
  'deleteDecks',
  'deleteNotes',
  'updateNoteFields',
  'updateNote',
  'sync',
  'guiBrowse',
  'guiSelectNote',
  'guiDeckReview',
]) {
  for (const code of ['ECONNRESET', 'ECONNABORTED', 'ETIMEDOUT']) {
    test(`${action} with ${code} preserves an uncertain result and sends only once`, async () => {
      const transportError = new AxiosError('connection failed', code);
      const h = clientHarness(async () => {
        throw transportError;
      });
      await assert.rejects(h.ankiReq(action), error => {
        assert.ok(error instanceof AnkiError);
        assert.ok(error instanceof AnkiUncertainError);
        assert.equal(error.action, action);
        assert.equal(error.cause, transportError);
        assert.match(error.message, /Check Anki before trying again/);
        return true;
      });
      assert.equal(h.calls.length, 1);
      assert.deepEqual(h.delays, []);
    });
  }
}

test('read-only connection resets retry with one-second exponential backoff', async () => {
  let attempts = 0;
  const h = clientHarness(async () => {
    if (++attempts < 3) throw new AxiosError('socket reset', 'ECONNRESET');
    return { data: { result: ['Default'], error: null } };
  });
  assert.deepEqual(await h.ankiReq('deckNames'), ['Default']);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.delays, [1000, 2000]);
});

test('read-only retries stop after five attempts and preserve the transport error', async () => {
  const transportError = new AxiosError('socket reset', 'ECONNRESET');
  const h = clientHarness(async () => {
    throw transportError;
  });
  await assert.rejects(h.ankiReq('cardsInfo', { cards: [123] }), error => error === transportError);
  assert.equal(h.calls.length, 5);
  assert.deepEqual(h.delays, [1000, 2000, 4000, 8000]);
});

test('backend errors are preserved without retries', async () => {
  const h = clientHarness(async () => ({
    data: { result: null, error: 'specific backend failure' },
  }));
  await assert.rejects(h.ankiReq('addNote'), error => {
    assert.ok(error instanceof AnkiError);
    assert.equal(error.message, 'specific backend failure');
    return true;
  });
  assert.equal(h.calls.length, 1);
});

test('connection refusals remain definite failures without retrying writes', async () => {
  const refused = new AxiosError('connection refused', 'ECONNREFUSED');
  const h = clientHarness(async () => {
    throw refused;
  });
  await assert.rejects(h.ankiReq('addNote'), error => error === refused);
  assert.equal(h.calls.length, 1);
});

test('accepted grading reports success and rejected transport errors propagate', async () => {
  assert.equal(await cardActions(async () => [true]).answerCard(123, 3), true);
  const failure = new Error('grade failed');
  await assert.rejects(
    cardActions(async () => {
      throw failure;
    }).answerCard(123, 3),
    error => error === failure
  );
});

test('areDue uses the due-status action with the requested card IDs', async () => {
  const calls = [];
  const actions = cardActions(async (...args) => {
    calls.push(args);
    return [true, false];
  });
  assert.deepEqual(await actions.areDue([123, 456]), [true, false]);
  assert.deepEqual(calls, [['areDue', { cards: [123, 456] }]]);
});

for (const action of ['createDeck', 'deleteDeck']) {
  test(`${action} preserves the backend failure`, async () => {
    const failure = new AnkiError('specific failure', action);
    const actions = loadSource('src/api/deckActions.ts', {
      './ankiClient': {
        ankiReq: async () => {
          throw failure;
        },
      },
      '../util': {},
    }).default;
    await assert.rejects(actions[action]('Example'), error => error === failure);
  });
}

test('native review passes the deck name and checks Anki accepted the request', async () => {
  let result = true;
  const calls = [];
  const actions = loadSource('src/api/guiActions.ts', {
    '../error/AnkiError': { AnkiError, AnkiUncertainError },
    './ankiClient': {
      ankiReq: async (...args) => {
        calls.push(args);
        return result;
      },
    },
  }).default;
  await actions.guiDeckReview('Languages');
  assert.deepEqual(calls, [['guiDeckReview', { name: 'Languages' }]]);
  result = false;
  await assert.rejects(actions.guiDeckReview('Missing'), /could not open deck/);
});

test('updating fields sends the note ID and fields without requiring creation properties', async () => {
  const calls = [];
  const actions = loadSource('src/api/noteActions.ts', {
    '@raycast/api': {},
    '../error/AnkiError': { AnkiError, AnkiUncertainError },
    '../util': {},
    './ankiClient': {
      ankiReq: async (...args) => {
        calls.push(args);
      },
    },
  }).default;
  const update = { id: 42, fields: { Prompt: 'Updated' } };
  await actions.updateNoteFields(update);
  assert.deepEqual(calls, [['updateNoteFields', { note: update }]]);
});

test('due cards exclude future timestamp learning and preview cards while preserving day-based queues', async context => {
  const now = 1_791_315_942;
  context.mock.method(Date, 'now', () => now * 1000);
  const cards = [
    { cardId: 1, queue: 1, due: now + 607 },
    { cardId: 2, queue: 4, due: now + 1 },
    { cardId: 3, queue: -1, due: now - 1 },
    { cardId: 4, queue: -2, due: now - 1 },
    { cardId: 5, queue: -3, due: now - 1 },
    { cardId: 6, queue: 0, due: now + 1000 },
    { cardId: 7, queue: 2, due: 50_000 },
    { cardId: 8, queue: 3, due: 50_000 },
    { cardId: 9, queue: 1, due: now },
    { cardId: 10, queue: 4, due: now - 1 },
    { cardId: 11, queue: 2, due: 50_001 },
  ];
  const actions = cardActions(async (action, params) => {
    if (action === 'cardsInfo') return cards;
    return params.cards.map(id => id !== 11);
  });
  const result = await actions.cardsDueInfo(cards.map(card => card.cardId));
  assert.deepEqual(
    result.map(card => card.cardId).sort((a, b) => a - b),
    [6, 7, 8, 9, 10]
  );
});

test('unavailable learning cards avoid due lookup until their scheduled timestamp', async context => {
  const card = { cardId: 1, queue: 1, due: 1000 };
  const now = context.mock.method(Date, 'now', () => 999_000);
  let dueLookups = 0;
  const actions = cardActions(async action => {
    if (action === 'cardsInfo') return [card];
    dueLookups++;
    return [true];
  });
  assert.deepEqual(await actions.cardsDueInfo([1]), []);
  assert.equal(dueLookups, 0);
  now.mock.mockImplementation(() => 1_000_000);
  assert.deepEqual(await actions.cardsDueInfo([1]), [card]);
  assert.equal(dueLookups, 1);
});

test('combined note update sends one write and warns when backend failure may follow partial save', async () => {
  const calls = [];
  const actions = loadSource('src/api/noteActions.ts', {
    '@raycast/api': {},
    '../error/AnkiError': { AnkiError, AnkiUncertainError },
    '../util': {},
    './ankiClient': {
      ankiReq: async (...args) => {
        calls.push(args);
        throw new AnkiError('tag failure', 'updateNote');
      },
    },
  }).default;
  await assert.rejects(
    actions.updateNote({ id: 42, fields: { Front: 'new' }, tags: ['tag'] }),
    error => {
      assert.match(error.message, /Some changes may have been saved/);
      assert.match(error.message, /tag failure/);
      return true;
    }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'updateNote');
});
