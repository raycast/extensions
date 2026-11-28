const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(filename, mocks = {}) {
  const { outputText } = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }
  );
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename })(
    name => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    module,
    module.exports
  );
  return module.exports;
}

const tags = loadSource('src/helpers/noteTags.ts');

test('new tags split whitespace, preserve nested tags and deduplicate selected tags', () => {
  assert.deepEqual(
    tags.mergeNoteTags(['existing', 'nested::tag'], ' new\nexisting\t nested::tag  '),
    ['existing', 'nested::tag', 'new']
  );
});

test('pagination caches IDs across recreated page factories and refreshes page zero', async () => {
  const calls = [];
  let ids = [1, 2, 3];
  const { createCardPageLoader } = loadSource('src/helpers/cardPages.ts', {
    '../api/ankiClient': {
      ankiReq: async (action, params) => {
        calls.push([action, params]);
        return action === 'findCards' ? ids : params.cards.map(cardId => ({ cardId }));
      },
    },
  });
  const load = createCardPageLoader(2);
  assert.deepEqual(await load('tag:test')({ page: 0 }), {
    data: [{ cardId: 1 }, { cardId: 2 }],
    hasMore: true,
  });
  ids = [9];
  assert.deepEqual(await load('tag:test')({ page: 1 }), { data: [{ cardId: 3 }], hasMore: false });
  assert.equal(calls.filter(([action]) => action === 'findCards').length, 1);
  assert.deepEqual(await load('tag:test')({ page: 0 }), { data: [{ cardId: 9 }], hasMore: false });
  await load('tag:other')({ page: 1 });
  assert.equal(calls.filter(([action]) => action === 'findCards').length, 3);
});

test('failed ID lookup can refresh and empty results skip cardsInfo', async () => {
  let fail = true;
  const calls = [];
  const { createCardPageLoader } = loadSource('src/helpers/cardPages.ts', {
    '../api/ankiClient': {
      ankiReq: async action => {
        calls.push(action);
        if (fail) throw new Error('offline');
        return [];
      },
    },
  });
  const load = createCardPageLoader();
  await assert.rejects(load('')({ page: 0 }), /offline/);
  fail = false;
  assert.deepEqual(await load('')({ page: 0 }), { data: [], hasMore: false });
  assert.deepEqual(calls, ['findCards', 'findCards']);
});

test('concurrent query changes keep each page bound to its requested IDs', async () => {
  let finishFirst;
  const { createCardPageLoader } = loadSource('src/helpers/cardPages.ts', {
    '../api/ankiClient': {
      ankiReq: async (action, params) => {
        if (action === 'cardsInfo') return params.cards.map(cardId => ({ cardId }));
        if (params.query === 'first')
          return new Promise(resolve => {
            finishFirst = resolve;
          });
        return [2];
      },
    },
  });
  const load = createCardPageLoader();
  const first = load('first')({ page: 0 });
  assert.deepEqual((await load('second')({ page: 0 })).data, [{ cardId: 2 }]);
  finishFirst([1]);
  assert.deepEqual((await first).data, [{ cardId: 1 }]);
});

const errors = loadSource('src/error/AnkiError.ts');
const presentation = loadSource('src/error/presentation.ts', { './AnkiError': errors });
const { AxiosError } = require('axios');

test('shared error descriptions distinguish backend, transport, uncertain and unexpected failures', () => {
  assert.match(
    presentation.describeError(new errors.AnkiError('model missing', 'addNote')).title,
    /Rejected/
  );
  assert.match(
    presentation.errorMarkdown(new errors.AnkiError('bad *value*', 'addNote')),
    /bad \\\*value\\\*/
  );
  assert.match(
    presentation.describeError(new AxiosError('refused', 'ECONNREFUSED')).title,
    /Connect/
  );
  assert.match(
    presentation.describeError(new errors.AnkiUncertainError('addNote', new Error())).advice,
    /already have been saved/
  );
  assert.equal(
    presentation.describeError(new Error('specific failure')).message,
    'specific failure'
  );
  assert.doesNotMatch(
    presentation.errorMarkdown(new errors.AnkiError('model missing', 'addNote')),
    /webBindPort/
  );
  assert.match(
    presentation.describeError(new errors.AnkiError('tag update failed', 'updateNote')).advice,
    /Some changes may have been saved/
  );
});

function editHarness(save = async () => {}) {
  const state = { calls: [], errors: [], pops: 0, values: undefined };
  const slots = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props });
  const Form = Object.assign(() => {}, {
    Description: 'Description',
    TextArea: 'TextArea',
    TagPicker: Object.assign(() => {}, { Item: 'Tag' }),
    TextField: 'TextField',
  });
  const react = {
    useRef: value => (slots[index++] ||= { current: value }),
    useState: value => {
      const slot = (slots[index++] ||= { current: value });
      return [slot.current, value => (slot.current = value)];
    },
  };
  const { EditNoteForm } = loadSource('src/actions/EditNoteAction.tsx', {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@raycast/api': {
      Form,
      Action: { SubmitForm: 'Submit' },
      ActionPanel: 'Actions',
      Detail: 'Detail',
      Toast: { Style: { Success: 'success' } },
      showToast: async () => {},
      useNavigation: () => ({ pop: () => state.pops++ }),
    },
    '@raycast/utils': {
      useCachedPromise: () => ({ data: ['existing'] }),
      useForm: options => {
        state.values ||= options.initialValues;
        state.submit = options.onSubmit;
        return {
          handleSubmit: options.onSubmit,
          values: state.values,
          itemProps: new Proxy({}, { get: (_, name) => ({ id: name, value: state.values[name] }) }),
        };
      },
    },
    '../api/noteActions': {
      updateNote: async params => {
        state.calls.push(params);
        await save(params);
      },
    },
    '../hooks/useErrorHandling': () => ({ handleError: async error => state.errors.push(error) }),
    '../helpers/noteTags': tags,
  });
  const note = {
    noteId: 400,
    modelName: 'Custom',
    tags: ['existing'],
    fields: {
      Back: { order: 1, value: '<img src="photo.png">[sound:voice.mp3]' },
      Prompt: { order: 0, value: 'original' },
    },
  };
  const render = () => {
    index = 0;
    return EditNoteForm({ note });
  };
  const change = values => {
    state.values = { ...state.values, ...values };
    render();
  };
  render();
  return { state, render, change };
}

test('editing orders custom fields and only sends changed fields by note ID, preserving media', async () => {
  const h = editHarness();
  const areas = h.render().props.children[1];
  assert.deepEqual(
    areas.map(area => area.props.title),
    ['Prompt', 'Back']
  );
  assert.equal(h.state.values.field_Back, '<img src="photo.png">[sound:voice.mp3]');
  h.change({ field_Prompt: 'updated' });
  await h.state.submit(h.state.values);
  assert.deepEqual(h.state.calls, [{ id: 400, fields: { Prompt: 'updated' } }]);
  assert.equal(h.state.pops, 1);
});

test('editing can clear tags and add newly typed tags without overwriting unchanged fields', async () => {
  const h = editHarness();
  h.change({ tags: [], newTags: 'new nested::tag new' });
  await h.state.submit(h.state.values);
  assert.deepEqual(h.state.calls, [{ id: 400, tags: ['new', 'nested::tag'] }]);
});

test('failed editing retains the current draft and stays open', async () => {
  const h = editHarness(async () => {
    throw new Error('failed');
  });
  h.change({ field_Prompt: 'draft' });
  assert.equal(await h.state.submit(h.state.values), false);
  assert.equal(h.state.values.field_Prompt, 'draft');
  assert.equal(h.state.pops, 0);
  assert.match(h.state.errors[0].message, /failed/);
});

test('editing prevents duplicate saves and preserves a newer draft after success', async () => {
  let finish;
  const h = editHarness(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  h.change({ field_Prompt: 'saved' });
  const first = h.state.submit(h.state.values);
  await h.state.submit(h.state.values);
  assert.equal(h.state.calls.length, 1);
  h.change({ field_Prompt: 'newer draft' });
  finish();
  await first;
  assert.equal(h.state.pops, 0);
  assert.equal(h.state.values.field_Prompt, 'newer draft');
  h.change({ field_Prompt: 'original' });
  const next = h.state.submit(h.state.values);
  finish();
  await next;
  assert.deepEqual(h.state.calls[1], { id: 400, fields: { Prompt: 'original' } });
});

test('deleted cards in an ID snapshot are omitted while later pages remain available', async () => {
  const { createCardPageLoader } = loadSource('src/helpers/cardPages.ts', {
    '../api/ankiClient': {
      ankiReq: async (action, params) =>
        action === 'findCards'
          ? [1, 2, 3]
          : params.cards.map(cardId => (cardId === 2 ? {} : { cardId })),
    },
  });
  const load = createCardPageLoader(1);
  await load('')({ page: 0 });
  assert.deepEqual(await load('')({ page: 1 }), { data: [], hasMore: true });
  assert.deepEqual(await load('')({ page: 2 }), { data: [{ cardId: 3 }], hasMore: false });
});

test('note editor mounts only freshly fetched notes when a previous version exists in cache', () => {
  const oldNote = { noteId: 42, fields: { Front: { value: 'old cached content', order: 0 } } };
  const freshNote = {
    ...oldNote,
    fields: { Front: { value: 'recently saved content', order: 0 } },
  };
  let response = { data: undefined, isLoading: true };
  const jsx = (type, props) => ({ type, props });
  const { default: EditNoteAction, EditNoteForm } = loadSource('src/actions/EditNoteAction.tsx', {
    react: {},
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@raycast/api': { Detail: 'Detail' },
    '@raycast/utils': {
      useCachedPromise: () => ({ data: [oldNote], isLoading: true }),
      usePromise: () => response,
    },
    '../api/noteActions': { notesInfo: () => {} },
    '../hooks/useErrorHandling': () => ({}),
    '../helpers/noteTags': tags,
  });
  const initial = EditNoteAction({ noteId: 42 });
  assert.equal(initial.type, 'Detail');
  assert.equal(initial.props.isLoading, true);
  response = { data: [freshNote], isLoading: false };
  const loaded = EditNoteAction({ noteId: 42 });
  assert.equal(loaded.type, EditNoteForm);
  assert.equal(loaded.props.note.fields.Front.value, 'recently saved content');
});
