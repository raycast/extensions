const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const Turndown = require('turndown');

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
  vm.runInThisContext(`(function(require, module, exports) {${outputText}\n})`, { filename })(
    name => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    module,
    module.exports
  );
  return module.exports;
}

const ankiErrors = loadSource('src/error/AnkiError.ts', {});

const card = {
  cardId: 1,
  question: '<div>Reverse prompt</div>',
  answer: '<div>Reverse prompt</div><hr id="answer"><div>Original front</div>',
  fields: {
    Front: { value: 'Original front', order: 0 },
    Back: { value: 'Reverse prompt', order: 1 },
  },
};

function harness({ cards = [card], answerCard = async () => true, refresh } = {}) {
  const hooks = [];
  let hookIndex = 0;
  let requestIndex = 0;
  const sameDeps = (a, b) =>
    a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const state = {
    toasts: [],
    grades: [],
    native: [],
    effects: [],
    media: { turndown: new Turndown(), isLoading: false },
  };
  const react = {
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = { value: initial };
      return [
        hooks[index].value,
        value => {
          hooks[index].value = typeof value === 'function' ? value(hooks[index].value) : value;
        },
      ];
    },
    useRef(value) {
      const index = hookIndex++;
      return (hooks[index] ||= { current: value });
    },
    useEffect(effect, deps) {
      const index = hookIndex++;
      if (!sameDeps(hooks[index]?.deps, deps)) {
        hooks[index] = { deps };
        state.effects.push(effect);
      }
    },
    useMemo(fn, deps) {
      const index = hookIndex++;
      if (!sameDeps(hooks[index]?.deps, deps)) hooks[index] = { deps, value: fn() };
      return hooks[index].value;
    },
    useCallback(fn, deps) {
      return react.useMemo(() => fn, deps);
    },
  };
  const requests = [
    { data: cards.map(c => c.cardId), isLoading: false },
    {
      data: cards,
      isLoading: false,
      async revalidate() {
        const result = refresh ? await refresh() : [];
        if (Array.isArray(result)) {
          requests[1].data = result;
          requests[1].error = undefined;
        } else requests[1].error = result;
        return result;
      },
    },
  ];
  const component = name => Object.assign(() => {}, { displayName: name });
  const ActionPanel = component('ActionPanel');
  ActionPanel.Section = component('Section');
  const { StudyDeck } = loadSource('src/actions/StudyDeck.tsx', {
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    '@raycast/api': {
      Action: component('Action'),
      ActionPanel,
      Detail: component('Detail'),
      useNavigation: () => ({ pop() {} }),
      showToast: async toast => state.toasts.push(toast),
      Toast: { Style: { Failure: 'failure' } },
    },
    '@raycast/utils': { useCachedPromise: () => requests[requestIndex++] },
    '../hooks/useTurndown': () => state.media,
    '../error/AnkiError': ankiErrors,
    '../types': { Ease: { Again: 1, Hard: 2, Good: 3, Easy: 4 } },
    '../api/cardActions': {
      async answerCard(...args) {
        state.grades.push(args);
        return answerCard(...args);
      },
    },
    '../api/guiActions': {
      async guiDeckReview(deck) {
        state.native.push(deck);
      },
    },
  });
  function render() {
    hookIndex = 0;
    requestIndex = 0;
    state.effects = [];
    const tree = StudyDeck({ deckName: 'Test Deck' });
    state.effects.forEach(effect => effect());
    return tree;
  }
  function action(title) {
    const nodes = [];
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) return node.forEach(walk);
      nodes.push(node);
      walk(node.props?.children);
      walk(node.props?.actions);
    }
    walk(render());
    return nodes.find(node => node.props?.title === title)?.props.onAction;
  }
  return { state, requests, render, action };
}

function deferred() {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
}

test('reversed questions and answers use Anki rendered card templates', () => {
  const h = harness();
  assert.equal(h.render().props.markdown, 'Reverse prompt');
  h.action('Show Answer')();
  assert.match(h.render().props.markdown, /Reverse prompt[\s\S]*Original front/);
});

test('cloze question hides raw field answer until revealed', () => {
  const h = harness({
    cards: [
      {
        ...card,
        question: 'Capital is <span class="cloze">[...]</span>',
        answer: 'Capital is <span class="cloze">Paris</span>',
        fields: { Text: { value: 'Capital is {{c1::Paris}}', order: 0 } },
      },
    ],
  });
  assert.doesNotMatch(h.render().props.markdown, /Paris/);
  h.action('Show Answer')();
  assert.match(h.render().props.markdown, /Paris/);
});

test('delayed media renderer readiness recomputes card view', () => {
  const h = harness();
  h.state.media = { isLoading: true };
  assert.equal(h.render().props.isLoading, true);
  assert.equal(h.action('Show Answer'), undefined);
  h.state.media = { isLoading: false, turndown: new Turndown() };
  assert.equal(h.render().props.markdown, 'Reverse prompt');
});

test('due and media load errors show failures instead of completion', () => {
  for (const source of ['due', 'media', 'cards']) {
    const h = harness({ cards: [] });
    if (source === 'media') h.state.media.error = new Error('media failed');
    else h.requests[source === 'cards' ? 0 : 1].error = new Error(`${source} failed`);
    assert.match(h.render().props.markdown, /Could not load/);
    assert.equal(h.state.toasts.at(-1).style, 'failure');
  }
});

test('failed grading retains answer and reports failure', async () => {
  const h = harness({ answerCard: async () => false });
  h.action('Show Answer')();
  await h.action('Good')();
  assert.match(h.render().props.markdown, /Original front/);
  assert.equal(h.state.toasts.at(-1).title, 'Could Not Save Answer');
  assert.ok(h.action('Good'));
});

test('repeated grading is blocked during write, refresh, and from stale actions', async () => {
  const write = deferred();
  const refresh = deferred();
  const h = harness({ answerCard: () => write.promise, refresh: () => refresh.promise });
  h.action('Show Answer')();
  const grade = h.action('Good');
  const first = grade();
  await grade();
  assert.equal(h.state.grades.length, 1);
  write.resolve(true);
  await new Promise(setImmediate);
  await grade();
  assert.equal(h.state.grades.length, 1);
  assert.equal(h.action('Good'), undefined);
  refresh.resolve([{ ...card, cardId: 2, question: 'Next card' }]);
  await first;
  await grade();
  assert.equal(h.state.grades.length, 1);
  assert.equal(h.render().props.markdown, 'Next card');
});

test('resolved refresh errors keep saved answer blocked and permit refresh without regrading', async () => {
  let refreshCount = 0;
  const h = harness({ refresh: async () => (++refreshCount === 1 ? new Error('offline') : []) });
  h.action('Show Answer')();
  await h.action('Good')();
  assert.match(h.render().props.markdown, /Answer saved/);
  assert.equal(h.action('Good'), undefined);
  assert.equal(h.action('Show Answer'), undefined);
  assert.equal(h.state.toasts.at(-1).title, 'Answer Saved, Refresh Failed');
  await h.action('Refresh Study Cards')();
  assert.equal(h.state.grades.length, 1);
  assert.match(h.render().props.markdown, /Congratulations/);
});

test('answer visibility is bound to the card identity', () => {
  const h = harness();
  h.action('Show Answer')();
  h.requests[1].data = [{ ...card, cardId: 2, question: 'Next card' }];
  assert.equal(h.render().props.markdown, 'Next card');
  assert.equal(h.action('Good'), undefined);
});

test('empty study queue can refresh until the last learning card becomes due again', async () => {
  let dueCards = [];
  const h = harness({ refresh: async () => dueCards });
  h.action('Show Answer')();
  await h.action('Again')();
  assert.match(h.render().props.markdown, /Refresh Study Cards to check again/);
  assert.equal(h.action('Show Answer'), undefined);
  assert.ok(h.action('Refresh Study Cards'));

  // Refreshing before the next learning step stays empty and keeps refresh available.
  await h.action('Refresh Study Cards')();
  assert.match(h.render().props.markdown, /Congratulations/);
  assert.ok(h.action('Refresh Study Cards'));

  dueCards = [card];
  await h.action('Refresh Study Cards')();
  assert.equal(h.render().props.markdown, 'Reverse prompt');
  assert.ok(h.action('Show Answer'));
  assert.equal(h.action('Good'), undefined);
  assert.deepEqual(h.state.grades, [[card.cardId, 1]]);
});

test('empty queue refresh blocks repeated requests while loading', async () => {
  const refresh = deferred();
  let refreshCount = 0;
  const h = harness({
    cards: [],
    refresh: () => {
      refreshCount++;
      return refresh.promise;
    },
  });
  const refreshAction = h.action('Refresh Study Cards');
  const first = refreshAction();
  assert.equal(h.render().props.isLoading, true);
  assert.equal(h.action('Refresh Study Cards'), undefined);
  await refreshAction();
  assert.equal(refreshCount, 1);
  refresh.resolve([card]);
  await first;
  assert.equal(h.render().props.markdown, 'Reverse prompt');
});

test('native reviewer action passes the deck name to Anki', async () => {
  const h = harness();
  await h.action('Study in Anki')();
  assert.deepEqual(h.state.native, ['Test Deck']);
});

test('media renderer resolves local and remote images without changing global escaping', () => {
  const before = Turndown.prototype.escape;
  const useTurndown = loadSource('src/hooks/useTurndown.ts', {
    '@raycast/utils': {
      useCachedPromise: () => ({ data: '/Anki/collection.media', isLoading: false }),
    },
    react: { useMemo: fn => fn() },
    '../api/mediaActions': {},
  }).default;
  const renderer = useTurndown();
  assert.equal(Turndown.prototype.escape, before);
  assert.equal(
    renderer.turndown.turndown('**bold** and [link](https://example.com)'),
    '**bold** and [link](https://example.com)'
  );
  assert.notEqual(new Turndown().turndown('**bold**'), '**bold**');
  assert.equal(renderer.isLoading, false);
  assert.match(
    renderer.turndown.turndown('<img src="local.png">'),
    /\/Anki\/collection.media\/local.png/
  );
  assert.match(
    renderer.turndown.turndown('<img src="https://example.com/image.png">'),
    /<https:\/\/example.com\/image.png>/
  );
  assert.equal(
    renderer.turndown.turndown('<style>.card {color:red}</style><script>alert(1)</script>Visible'),
    'Visible'
  );
});

for (const question of [
  'Question [[type:Back]]',
  '<input id="typeans" type="text">',
  '<input type="text" id=typeans>',
  '<img src="unmasked-answer.png"><canvas id="image-occlusion-canvas"></canvas>',
  '<anki-image-occlusion>Hidden mask</anki-image-occlusion>',
  '<img src="unmasked-answer.png"><script>anki.imageOcclusion.setup();</script>',
]) {
  test(`unsupported rendered template routes to native study (${question.slice(0, 35)})`, () => {
    const h = harness({ cards: [{ ...card, modelName: 'Renamed custom model', question }] });
    assert.match(h.render().props.markdown, /Study this card in Anki/);
    assert.doesNotMatch(h.render().props.markdown, /unmasked-answer/);
    assert.equal(h.action('Show Answer'), undefined);
    assert.equal(h.action('Good'), undefined);
    assert.ok(h.action('Study in Anki'));
  });
}

test('unknown grading outcome blocks current and stale grade actions until explicit refresh', async () => {
  const h = harness({
    answerCard: async () => {
      throw new ankiErrors.AnkiUncertainError('answerCards', new Error('connection reset'));
    },
    refresh: async () => [{ ...card, cardId: 2, question: 'Next card' }],
  });
  h.action('Show Answer')();
  const staleGrade = h.action('Good');
  await staleGrade();
  assert.match(h.render().props.markdown, /Answer status unknown/);
  assert.match(h.render().props.markdown, /Check Anki, then refresh/);
  assert.doesNotMatch(h.render().props.markdown, /Answer saved/);
  assert.equal(h.action('Good'), undefined);
  assert.equal(h.action('Show Answer'), undefined);
  await staleGrade();
  assert.equal(h.state.grades.length, 1);
  assert.equal(h.state.toasts.at(-1).title, 'Answer Status Unknown');
  await h.action('Refresh Study Cards')();
  assert.equal(h.state.grades.length, 1);
  assert.equal(h.render().props.markdown, 'Next card');
  assert.ok(h.action('Show Answer'));
  await staleGrade();
  assert.equal(h.state.grades.length, 1);
});

test('definite backend grade rejection keeps retry available', async () => {
  const h = harness({
    answerCard: async () => {
      throw new ankiErrors.AnkiError('answerCards was rejected', 'answerCards');
    },
  });
  h.action('Show Answer')();
  await h.action('Good')();
  assert.ok(h.action('Good'));
  assert.equal(h.action('Refresh Study Cards'), undefined);
  assert.match(h.render().props.markdown, /Original front/);
});
