const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function createCommand() {
  const states = [];
  const requests = [];
  const requestRef = { current: 0 };
  let stateIndex = 0;
  let effect;
  let refresh;
  const List = Object.assign(() => {}, {
    Item: Object.assign(() => {}, { Detail: () => {} }),
    EmptyView: () => {},
  });
  const jsx = (type, props) => ({ type, props });
  const source = fs.readFileSync(path.join(__dirname, "../src/history.tsx"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (id) => {
      if (id === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (id === "react") return {
        useState: (initial) => {
          const index = stateIndex++;
          if (!(index in states)) states[index] = initial;
          return [states[index], (value) => { states[index] = value; }];
        },
        useRef: () => requestRef,
        useCallback: (callback) => refresh ||= callback,
        useEffect: (callback) => { effect ||= callback; },
      };
      if (id === "@raycast/api") return { List, Icon: { Clock: "clock" }, Image: { Mask: {} } };
      if (id === "./history-store") return {
        readWallpaperHistory: () => new Promise((resolve) => requests.push(resolve)),
        getExistingHistoryDownloadPath: async () => undefined,
      };
      if (id === "./actions") return {};
      if (id === "./utils") return { buildWallpaperMarkdown: () => "", getThumbnailUrl: () => "" };
      throw new Error(`Unexpected import: ${id}`);
    },
  });
  function render() {
    stateIndex = 0;
    return exports.default();
  }
  render();
  const unmount = effect();
  return { requests, refresh: () => refresh(), render, unmount };
}

const artwork = {
  eventId: "saved", eventType: "selected", timestamp: "2026-01-01T00:00:00.000Z",
  wallpaper: { name: "Artwork", artist: "Artist", creationDate: "1900", url: "https://example.com/art.jpg" },
  events: [],
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("an older initial load cannot restore rows after a newer clear-history refresh", async () => {
  const command = createCommand();
  const cleared = command.refresh();
  command.requests[1]([]);
  await cleared;
  command.requests[0]([artwork]);
  await settle();
  assert.equal(command.render().props.children.props.title, "No wallpaper history yet");
  assert.equal(command.render().props.isLoading, false);
});

test("an older refresh cannot finish loading or restore rows while the latest refresh is pending", async () => {
  const command = createCommand();
  command.requests[0]([artwork]);
  await settle();
  const older = command.refresh();
  const latest = command.refresh();
  command.requests[1]([artwork]);
  await older;
  assert.equal(command.render().props.isLoading, true);
  command.requests[2]([]);
  await latest;
  assert.equal(command.render().props.children.props.title, "No wallpaper history yet");
  assert.equal(command.render().props.isLoading, false);
});

test("unmount invalidates pending history loads", async () => {
  const command = createCommand();
  command.unmount();
  command.requests[0]([artwork]);
  await settle();
  assert.equal(command.render().props.children.props.title, "No wallpaper history yet");
  assert.equal(command.render().props.isLoading, true);
});
