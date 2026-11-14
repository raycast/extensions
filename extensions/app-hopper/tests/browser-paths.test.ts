import assert from "node:assert/strict";
import test from "node:test";
import createLoader from "./load-ts.ts";
import { renderer, findAll } from "./render-ui.ts";

test("browser paths come from the running application and remain intact through navigation and tab search", () => {
  const bundlePath = "/Users/another-user/Applications/Google Chrome.app";
  const window = {
    id: 10,
    pid: 20,
    app: "Google Chrome",
    localizedName: "Google Chrome",
    title: "Work",
    bundlePath,
    space: 2,
    "has-ax-reference": true,
  };
  const browserWindow = {
    id: "10",
    title: "Work",
    space: 2,
    tabs: [{ id: "10:ax:one", title: "Unique page", url: "https://example.com" }],
  };
  const view = renderer({
    windows: [window],
    metadataByPid: {},
    applicationOrder: [20],
    browserCounts: { chrome: { windows: 1 } },
    browserTabs: { chrome: [browserWindow] },
    axWindowsByPid: {},
  });
  const target = findAll(view.render(), (node) => node.props.title === "Show Browser Tabs and Windows")[0].props.target;
  assert.equal(target.props.browser.appPath, bundlePath);
  const child = renderer(
    { browserWindows: [browserWindow] },
    {},
    "src/browser-windows.tsx",
    "BrowserWindowsView",
    target.props,
  );
  assert.equal(
    findAll(child.render(), (node) => node.type === child.ui.List.Item)[0].props.icon.value.fileIcon,
    bundlePath,
  );
  view.render().props.onSearchTextChange("Unique page");
  assert.equal(
    findAll(view.render(), (node) => node.type === view.ui.List.Item)[0].props.icon.value.fileIcon,
    bundlePath,
  );
});

test("unknown browser paths use a generic icon instead of assuming /Applications", () => {
  const { getBrowserByAppName } = createLoader({})("src/browsers/registry.ts");
  const { getBrowserTabProps } = createLoader({ "@raycast/api": { Icon: { Globe: "globe" } } })(
    "src/helpers/browser-tab-presentation.ts",
  );
  const browser = getBrowserByAppName("Google Chrome");
  assert.equal(browser.appPath, undefined);
  const props = getBrowserTabProps(
    browser,
    { id: "10", title: "Work", tabs: [] },
    { id: "one", title: "Page", url: "" },
  );
  assert.equal(props.icon.value, "globe");
  assert.equal(getBrowserByAppName("Google Chrome", "/Volumes/Apps/Chrome.app").appPath, "/Volumes/Apps/Chrome.app");
});
