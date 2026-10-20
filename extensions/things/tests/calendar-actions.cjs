const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function renderCalendar(state) {
  const api = {
    Action: Object.assign((props) => React.createElement('Action', props), {
      OpenInBrowser: 'OpenInBrowser',
      Push: 'Push',
    }),
    ActionPanel: 'ActionPanel',
    Icon: {},
    List: { Section: 'ListSection', Item: 'ListItem' },
  };
  function load(file) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      exports,
      require(name) {
        if (name === '@raycast/api') return api;
        if (name === '@raycast/utils') return { usePromise: () => ({ ...state, revalidate() {} }) };
        if (name === '../calendar') return { getCalendarEvents() {} };
        if (name === '../calendar-model') return { eventTimeLabel: () => 'All day' };
        if (name === '../add-new-todo') return { AddNewTodo: () => null };
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.tsx'));
        return require(name);
      },
    });
    return exports;
  }
  const Component = load(path.resolve(__dirname, '../src/components/CalendarEvents.tsx')).default;
  const titles = [];
  const urls = [];
  function visit(element) {
    if (Array.isArray(element)) return element.forEach(visit);
    if (!React.isValidElement(element)) return;
    if (typeof element.type === 'function') return visit(element.type(element.props));
    if (element.props.title) titles.push(element.props.title);
    if (element.props.url) urls.push(element.props.url);
    visit(element.props.children);
    visit(element.props.actions);
  }
  visit(Component({ list: 'today', names: '', days: '30', searchText: 'a & b' }));
  return { titles, urls };
}

for (const [name, state] of Object.entries({
  loading: { isLoading: true },
  empty: { data: [] },
  error: { error: new Error('Denied') },
  events: {
    data: [
      { key: 'event', title: 'Meeting', calendar: 'Work', start: '2026-10-20T10:00:00Z', end: '2026-10-20T11:00:00Z' },
    ],
  },
})) {
  test(`calendar ${name} rows preserve Things creation and search actions`, () => {
    const { titles, urls } = renderCalendar(state);
    assert.ok(titles.includes('Add New To-Do'));
    assert.ok(titles.includes('Search in Things'));
    assert.ok(urls.includes('things:///search?query=a%20%26%20b'));
  });
}
