const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadSource(filename, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
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

const util = loadSource('src/util.ts', { '@raycast/api': {} });
const baseValues = { deckName: 'Languages', modelName: 'Custom Vocabulary', tags: ['study'] };

test('preserves arbitrary selected field names and blank optional fields', () => {
  const fields = ['Front', '文法 / Grammar', '__proto__', 'constructor', 'Optional'];
  const values = {
    ...baseValues,
    field_Front: 'bonjour',
    'field_文法 / Grammar': 'greeting',
    field___proto__: 'prototype field',
    field_constructor: 'constructor field',
    field_Unselected: 'must not leak',
    file_Unselected: ['/tmp/other.mp3'],
  };
  const note = util.transformSubmittedData(values, fields);
  assert.deepEqual(Object.keys(note.fields), fields);
  assert.equal(note.fields.__proto__, 'prototype field');
  assert.equal(note.fields.constructor, 'constructor field');
  assert.equal(note.fields.Optional, '');
  assert.equal(note.fields['文法 / Grammar'], 'greeting');
  assert.equal(note.deckName, baseValues.deckName);
  assert.equal(note.modelName, baseValues.modelName);
  assert.deepEqual(note.tags, ['study']);
  assert.deepEqual(note.audio, []);
  assert.equal(JSON.parse(JSON.stringify(note)).fields.__proto__, 'prototype field');
});

for (const [kind, extensions] of Object.entries({
  picture: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
  video: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
})) {
  for (const extension of extensions) {
    test(`accepts and serializes ${extension} attachments without changing their paths`, () => {
      const file = `/Users/example/My Files/attachment.${extension.toUpperCase()}`;
      assert.equal(util.isValidFileType(file), true);
      const note = util.transformSubmittedData({ ...baseValues, file_Front: [file] }, ['Front']);
      assert.equal(note.fields.Front, '');
      assert.deepEqual(note[kind], [
        { path: file, filename: path.basename(file), fields: ['Front'] },
      ]);
    });
  }
}

test('rejects unsupported attachments instead of silently omitting them', () => {
  for (const file of ['/tmp/file.pdf', '/tmp/no-extension', '/tmp/file.mp3.exe']) {
    assert.equal(util.isValidFileType(file), false);
    assert.throws(
      () => util.transformSubmittedData({ ...baseValues, file_Front: [file] }, ['Front']),
      /Unsupported file type/
    );
  }
});

function formHarness({ allowEmpty = false, addNote = async () => {} } = {}) {
  const state = { values: undefined, errors: {}, submitted: [], effects: [], resetCount: 0 };
  const refs = [];
  let hookIndex = 0;
  const models = [
    {
      id: 1,
      name: 'Custom',
      flds: [
        { name: 'Optional', ord: 1 },
        { name: 'Prompt', ord: 0 },
      ],
    },
    {
      id: 2,
      name: 'Other',
      flds: [
        { name: 'Prompt', ord: 0 },
        { name: 'Extra', ord: 1 },
      ],
    },
  ];
  const requests = [
    { data: [{ name: 'Languages', deck_id: 1 }], isLoading: false },
    { data: models, isLoading: false },
    { data: ['study'], isLoading: false },
  ];
  let requestIndex = 0;
  const component = name => Object.assign(() => {}, { displayName: name });
  const Form = component('Form');
  for (const name of ['Dropdown', 'TextArea', 'TextField', 'FilePicker', 'TagPicker'])
    Form[name] = component(name);
  Form.Dropdown.Item = component('DropdownItem');
  Form.TagPicker.Item = component('TagPickerItem');
  const Action = component('Action');
  Action.SubmitForm = component('SubmitForm');
  const react = {
    Fragment: 'Fragment',
    useRef(value) {
      const index = hookIndex++;
      return (refs[index] ||= { current: value });
    },
    useState(value) {
      const index = hookIndex++;
      const ref = (refs[index] ||= { current: value });
      return [
        ref.current,
        next => {
          ref.current = next;
        },
      ];
    },
    useEffect(effect) {
      state.effects.push(effect);
    },
  };
  const AddCard = loadSource('src/actions/AddCardAction.tsx', {
    '../helpers/noteTags': loadSource('src/helpers/noteTags.ts', {}),
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    '@raycast/api': {
      Form,
      Action,
      ActionPanel: component('ActionPanel'),
      Detail: component('Detail'),
      getPreferenceValues: () => ({ allow_empty_card_fields: allowEmpty }),
      showToast: async () => {},
      Toast: { Style: { Success: 'success', Failure: 'failure' } },
    },
    '@raycast/utils': {
      useCachedPromise: () => requests[requestIndex++],
      useForm(options) {
        state.values ||= options.initialValues;
        state.submit = options.onSubmit;
        return {
          values: state.values,
          handleSubmit: options.onSubmit,
          focus() {},
          setValidationError(id, error) {
            state.errors[id] = error;
          },
          reset(values) {
            state.values = values;
            state.errors = {};
            state.resetCount++;
          },
          itemProps: new Proxy(
            {},
            {
              get(_, id) {
                return {
                  id,
                  value: state.values[id],
                  error: state.errors[id],
                  ref: `hook-ref-${id}`,
                  onChange(value) {
                    state.values = { ...state.values, [id]: value };
                  },
                };
              },
            }
          ),
        };
      },
    },
    '../api/noteActions': {
      addNote: async note => {
        state.submitted.push(note);
        await addNote(note);
      },
    },
    '../api/deckActions': {},
    '../api/modelActions': {},
    '../util': util,
    '../hooks/useErrorHandling': () => ({
      handleError(error) {
        state.error = error;
      },
      errorMarkdown: 'Error',
    }),
  }).default;
  function render() {
    hookIndex = 0;
    requestIndex = 0;
    state.effects = [];
    const tree = AddCard({ deckName: 'Languages' });
    const nodes = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      nodes.push(node);
      walk(node.props?.children);
      walk(node.props?.actions);
    }
    walk(tree);
    return nodes;
  }
  function find(id) {
    return render().find(node => node.props?.id === id);
  }
  render();
  find('modelName').props.onChange('Custom');
  return { state, render, find, requests, Action };
}

test('custom form orders fields and submits notes with optional fields empty', async () => {
  const h = formHarness();
  const fieldIds = h
    .render()
    .filter(node => node.type?.displayName === 'TextArea')
    .map(node => node.props.id);
  assert.deepEqual(fieldIds, ['field_Prompt', 'field_Optional']);
  h.find('field_Prompt').props.onChange('question');
  h.render();
  assert.equal(await h.state.submit(h.state.values), true);
  assert.deepEqual(h.state.submitted[0].fields, { Prompt: 'question', Optional: '' });
  assert.equal(h.state.values.deckName, 'Languages');
  assert.equal(h.state.values.modelName, 'Custom');
  assert.equal(h.state.values.field_Prompt, '');
});

test('file picker updates hook state and media satisfies the first field', async () => {
  const h = formHarness();
  const picker = h.find('file_Prompt');
  assert.equal(picker.props.ref, 'hook-ref-file_Prompt');
  picker.props.onChange(['/tmp/pronunciation.m4a']);
  assert.deepEqual(h.state.values.file_Prompt, ['/tmp/pronunciation.m4a']);
  h.render();
  assert.equal(await h.state.submit(h.state.values), true);
  assert.equal(h.state.submitted[0].audio[0].path, '/tmp/pronunciation.m4a');
});

test('requires the first field and validates attachments again on submission', async () => {
  const h = formHarness();
  h.render();
  assert.equal(await h.state.submit(h.state.values), false);
  assert.match(h.state.errors.field_Prompt, /first field/);
  h.state.values.file_Prompt = ['/tmp/file.pdf'];
  assert.equal(await h.state.submit(h.state.values), false);
  assert.match(h.state.errors.file_Prompt, /Unsupported files/);
  assert.equal(h.state.submitted.length, 0);
});

test('empty-first-field preference defers validation to Anki', async () => {
  const h = formHarness({ allowEmpty: true });
  h.render();
  assert.equal(await h.state.submit(h.state.values), true);
  assert.equal(h.state.submitted.length, 1);
});

test('switching note types clears shared field values, attachments, and validation errors', () => {
  const h = formHarness();
  h.find('field_Prompt').props.onChange('old question');
  h.find('file_Prompt').props.onChange(['/tmp/file.pdf']);
  h.find('tags').props.onChange(['study']);
  h.find('modelName').props.onChange('Other');
  assert.deepEqual(h.state.values, {
    deckName: 'Languages',
    modelName: 'Other',
    tags: ['study'],
    newTags: '',
    field_Prompt: '',
    file_Prompt: [],
    field_Extra: '',
    file_Extra: [],
  });
  assert.deepEqual(h.state.errors, {});
});

test('background model refresh preserves visible draft fields', () => {
  const h = formHarness();
  h.find('field_Prompt').props.onChange('draft');
  h.requests[1].isLoading = true;
  assert.equal(h.find('field_Prompt').props.value, 'draft');
  for (const effect of h.state.effects) effect();
  assert.equal(h.state.values.field_Prompt, 'draft');
});

test('a deleted note type becomes a recoverable selection error', () => {
  const h = formHarness();
  h.requests[1].data = [];
  assert.doesNotThrow(h.render);
  for (const effect of h.state.effects) effect();
  assert.equal(h.state.values.modelName, '');
  assert.match(h.state.errors.modelName, /unavailable/);
});

test('repeated submission while a note is being added does not create another note', async () => {
  let finish;
  const pending = new Promise(resolve => {
    finish = resolve;
  });
  const h = formHarness({ addNote: () => pending });
  h.find('field_Prompt').props.onChange('question');
  h.render();
  const submit = h.state.submit;
  const first = submit(h.state.values);
  assert.equal(await submit(h.state.values), false);
  assert.equal(h.state.submitted.length, 1);
  finish();
  assert.equal(await first, true);
});

for (const changeModel of [false, true]) {
  test(`successful submission preserves a newer draft ${changeModel ? 'after a note type change' : 'in the same note type'}`, async () => {
    let finish;
    const pending = new Promise(resolve => {
      finish = resolve;
    });
    const h = formHarness({ addNote: () => pending });
    h.find('field_Prompt').props.onChange('submitted question');
    h.render();
    const first = h.state.submit(h.state.values);
    if (changeModel) h.find('modelName').props.onChange('Other');
    h.find('field_Prompt').props.onChange('new draft');
    h.render();
    const newerDraft = h.state.values;
    finish();
    assert.equal(await first, true);
    assert.equal(h.state.values, newerDraft);
    assert.equal(h.state.values.modelName, changeModel ? 'Other' : 'Custom');
    assert.equal(h.state.values.field_Prompt, 'new draft');
    assert.equal(h.state.submitted.length, 1);
    assert.equal(h.state.submitted[0].fields.Prompt, 'submitted question');
  });
}

test('add note merges newly entered tags with selected tags', async () => {
  const h = formHarness();
  h.find('field_Prompt').props.onChange('question');
  h.find('tags').props.onChange(['study']);
  h.find('newTags').props.onChange('new nested::tag study');
  h.render();
  assert.equal(await h.state.submit(h.state.values), true);
  assert.deepEqual(h.state.submitted[0].tags, ['study', 'new', 'nested::tag']);
});
