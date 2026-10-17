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
  return module.exports.default;
}

function uiHarness(filename, mocks = {}, createMocks = () => ({})) {
  const slots = [];
  let index = 0;
  const component = name => Object.assign(() => {}, { displayName: name });
  const Action = component('Action');
  for (const name of ['Push', 'OpenInBrowser', 'ToggleQuickLook', 'SubmitForm'])
    Action[name] = component(name);
  const ActionPanel = component('ActionPanel');
  ActionPanel.Section = component('ActionPanel.Section');
  const Form = component('Form');
  Form.TextField = component('Form.TextField');
  const Grid = component('Grid');
  const List = component('List');
  for (const root of [Grid, List]) {
    root.Item = component(`${root.displayName}.Item`);
    root.Section = component(`${root.displayName}.Section`);
    root.Dropdown = component(`${root.displayName}.Dropdown`);
    root.Dropdown.Item = component(`${root.displayName}.Dropdown.Item`);
    root.Dropdown.Section = component(`${root.displayName}.Dropdown.Section`);
  }
  List.Item.Detail = component('Detail');
  List.Item.Detail.Metadata = component('Metadata');
  List.Item.Detail.Metadata.Label = component('Label');
  const state = {
    errors: [],
    toasts: [],
    pops: 0,
    confirmations: [],
    confirmation: true,
    revalidations: 0,
  };
  const memo = (fn, dependencies) => {
    const slotIndex = index++;
    const previous = slots[slotIndex];
    if (
      !previous ||
      dependencies.some((dependency, i) => dependency !== previous.dependencies[i])
    ) {
      slots[slotIndex] = { value: fn(), dependencies };
    }
    return slots[slotIndex].value;
  };
  const react = {
    useRef(value) {
      const slotIndex = index++;
      return (slots[slotIndex] ||= { current: value });
    },
    useState(initial) {
      const slotIndex = index++;
      const slot = (slots[slotIndex] ||= {
        value: typeof initial === 'function' ? initial() : initial,
      });
      return [
        slot.value,
        value => {
          slot.value = typeof value === 'function' ? value(slot.value) : value;
        },
      ];
    },
    useEffect() {},
    useMemo: memo,
    useCallback: (callback, dependencies) => memo(() => callback, dependencies),
  };
  const handleError = error => state.errors.push(error);
  const errorHook = error => ({ handleError, errorMarkdown: error?.message });
  const revalidate = async () => {
    state.revalidations++;
  };
  const Component = loadSource(filename, {
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    '@raycast/api': {
      Action,
      ActionPanel,
      Form,
      Grid,
      List,
      Keyboard: { Shortcut: { Common: { Edit: { modifiers: ['cmd'], key: 'e' } } } },
      Detail: component('Detail'),
      showToast: async toast => state.toasts.push(toast),
      Toast: { Style: { Success: 'success' } },
      useNavigation: () => ({
        pop: () => {
          state.pops++;
        },
      }),
      confirmAlert: async options => {
        state.confirmations.push(options);
        return state.confirmation;
      },
    },
    '../hooks/useErrorHandling': errorHook,
    './hooks/useErrorHandling': errorHook,
    '@raycast/utils': { useCachedPromise: () => ({ data: state.data, revalidate }) },
    ...mocks,
    ...createMocks({ react, state, revalidate }),
  });
  const walk = node => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    return [
      node,
      ...walk(node.props?.children),
      ...walk(node.props?.actions),
      ...walk(node.props?.searchBarAccessory),
    ];
  };
  return {
    state,
    render(props = {}) {
      index = 0;
      return walk(Component(props));
    },
    walk,
  };
}

function deckHarness(createDeck = async () => {}) {
  const calls = [];
  const h = uiHarness('src/actions/CreateDeckAction.tsx', {
    '../api/deckActions': {
      createDeck: async name => {
        calls.push(name);
        await createDeck(name);
      },
    },
  });
  const submit = () =>
    h.render().find(node => node.type.displayName === 'SubmitForm').props.onSubmit;
  return { ...h, calls, submit };
}

test('failed deck creation keeps the form open and reports the error', async () => {
  const failure = new Error('Anki is unavailable');
  const h = deckHarness(async () => {
    throw failure;
  });
  await h.submit()({ deckName: 'Draft name' });
  assert.equal(h.state.pops, 0);
  assert.deepEqual(h.state.errors, [failure]);
  assert.equal(h.state.toasts.length, 0);
});

test('blank deck names show a field error and never call Anki', async () => {
  const h = deckHarness();
  await h.submit()({ deckName: '   ' });
  assert.deepEqual(h.calls, []);
  assert.equal(h.state.pops, 0);
  const field = h.render().find(node => node.props.id === 'deckName');
  assert.match(field.props.error, /deck name/);
  field.props.onChange('Languages');
  assert.equal(h.render().find(node => node.props.id === 'deckName').props.error, undefined);
});

test('pending deck creation accepts one submission and closes only after success', async () => {
  let finish;
  const h = deckHarness(
    () =>
      new Promise(resolve => {
        finish = resolve;
      })
  );
  const submit = h.submit();
  const first = submit({ deckName: ' Languages ' });
  await submit({ deckName: 'Duplicate' });
  assert.deepEqual(h.calls, ['Languages']);
  assert.equal(h.state.pops, 0);
  assert.equal(h.render()[0].props.isLoading, true);
  finish();
  await first;
  assert.equal(h.state.pops, 1);
  assert.equal(h.state.toasts[0].message, 'Languages');
});

function mediaHarness() {
  const h = uiHarness('src/actions/ViewCardMedia.tsx', { '../api/mediaActions': {} });
  h.state.data = '/Anki/collection.media';
  return h;
}
const media = {
  All: [{ filename: 'one.png', type: 'image' }],
  Front: [{ filename: 'two.mp3', type: 'audio' }],
};

test('media filter uses the Grid dropdown and distinguishes a field named All', () => {
  const h = mediaHarness();
  const tree = h.render({ cardMedia: media });
  const dropdown = tree.find(node => node.type?.displayName === 'Grid.Dropdown');
  assert.ok(dropdown);
  const allField = tree.find(
    node => node.type?.displayName === 'Grid.Dropdown.Item' && node.props.title === 'All'
  );
  assert.notEqual(allField.props.value, '');
  dropdown.props.onChange(allField.props.value);
  assert.deepEqual(
    h
      .render({ cardMedia: media })
      .filter(node => node.type?.displayName === 'Grid.Item')
      .map(node => node.props.title),
    ['one.png']
  );
});

test('missing media field selection falls back to all current fields without crashing', () => {
  const h = mediaHarness();
  const tree = h.render({ cardMedia: media });
  const dropdown = tree.find(node => node.type?.displayName.endsWith('.Dropdown'));
  dropdown.props.onChange('field:Removed');
  tree[0].props.onSearchTextChange('two');
  const updated = h.render({ cardMedia: media });
  assert.deepEqual(
    updated.filter(node => node.type?.displayName === 'Grid.Item').map(node => node.props.title),
    ['two.mp3']
  );
  assert.equal(updated.find(node => node.type?.displayName === 'Grid.Dropdown').props.value, '');
});

function browseHarness(createMocks) {
  const deleted = [];
  const h = uiHarness(
    'src/browseCards.tsx',
    {
      './actions/EditNoteAction': () => {},
      './helpers/cardPages': { createCardPageLoader: () => () => {} },
      './actions/AddCardAction': () => {},
      './actions/ViewCardMedia': () => {},
      './api/guiActions': {},
      './api/ankiClient': {},
      './api/noteActions': { deleteNote: async cardId => deleted.push(cardId) },
      './hooks/useTurndown': () => ({ turndown: { turndown: value => value } }),
      './util': { parseMediaFiles: () => [], getCardType: () => 'new' },
    },
    createMocks
  );
  h.state.data = [101, 202].map(cardId => ({
    cardId,
    fields: { Front: { value: `Card ${cardId}` } },
  }));
  const actions = () =>
    h
      .render()
      .filter(node => node.type?.displayName === 'List.Item')
      .map(node =>
        h.walk(node.props.actions).find(action => action.props?.title === 'Delete Note')
      );
  return { ...h, deleted, actions };
}

test('delete note action belongs to its card and warns about every associated card', async () => {
  const h = browseHarness();
  const actions = h.actions();
  assert.ok(actions.every(Boolean));
  await actions[1].props.onAction();
  await actions[0].props.onAction();
  assert.deepEqual(h.deleted, [202, 101]);
  assert.match(h.state.confirmations[0].message, /all associated cards/);
  assert.equal(h.state.confirmations[0].primaryAction.title, 'Delete Note');
  assert.equal(h.state.toasts[0].title, 'Deleted note and all associated cards');
  assert.equal(h.state.revalidations, 2);
});

test('canceling Delete Note never writes or reports success', async () => {
  const h = browseHarness();
  h.state.confirmation = false;
  await h.actions()[0].props.onAction();
  assert.deepEqual(h.deleted, []);
  assert.deepEqual(h.state.toasts, []);
});

test('browse uses Anki search filtering and edits the note behind the selected card', () => {
  const h = browseHarness();
  h.state.data[0].note = 999;
  const nodes = h.render();
  assert.equal(nodes.find(node => node.type?.displayName === 'List').props.filtering, false);
  const edit = nodes.find(node => node.props?.title === 'Edit Note');
  assert.equal(edit.props.target.props.noteId, 999);
});

function browseWithMediaHarness() {
  return browseHarness(({ react, state, revalidate }) => {
    const getMediaDirPath = () => {};
    state.media = { data: '/Anki/collection.media', isLoading: false };
    const utils = {
      useCachedPromise: fn =>
        fn === getMediaDirPath
          ? state.media
          : { data: state.data, isLoading: state.cardsLoading, revalidate },
    };
    return {
      '@raycast/utils': utils,
      './hooks/useTurndown': loadSource('src/hooks/useTurndown.ts', {
        react,
        '@raycast/utils': utils,
        '../api/mediaActions': { getMediaDirPath },
      }),
    };
  });
}

test('browse keeps cached cards visible while their media directory refreshes', () => {
  const h = browseWithMediaHarness();
  const titles = () =>
    h
      .render()
      .filter(node => node.type?.displayName === 'List.Item')
      .map(node => node.props.title);

  assert.deepEqual(titles(), ['Card 101', 'Card 202']);
  h.state.media.isLoading = true;
  h.state.cardsLoading = true;
  assert.deepEqual(titles(), ['Card 101', 'Card 202']);
  h.state.media.isLoading = false;
  h.state.cardsLoading = false;
  assert.deepEqual(titles(), ['Card 101', 'Card 202']);
});

test('browse shows loading while cards are cached but their media directory is not', () => {
  const h = browseWithMediaHarness();
  h.state.media = { data: undefined, isLoading: true };
  h.state.cardsLoading = false;
  const nodes = h.render();
  assert.equal(nodes.find(node => node.type?.displayName === 'List').props.isLoading, true);
  assert.equal(nodes.filter(node => node.type?.displayName === 'List.Item').length, 0);

  h.state.media = { data: '/Anki/collection.media', isLoading: false };
  const loaded = h.render();
  assert.equal(loaded.find(node => node.type?.displayName === 'List').props.isLoading, false);
  assert.equal(loaded.filter(node => node.type?.displayName === 'List.Item').length, 2);
});

test('browse reports a media directory failure instead of an empty result list', () => {
  const h = browseWithMediaHarness();
  h.state.media = { data: undefined, isLoading: false, error: new Error('Cannot load media') };
  const nodes = h.render();
  assert.equal(
    nodes.some(node => node.type?.displayName === 'List'),
    false
  );
  assert.equal(
    nodes.find(node => node.type?.displayName === 'Detail').props.markdown,
    'Cannot load media'
  );
});
