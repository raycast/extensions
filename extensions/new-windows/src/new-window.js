"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const child_process_1 = require("child_process");
const react_1 = require("react");
const api_1 = require("@raycast/api");
function default_1() {
  const [searchText, setSearchText] = (0, react_1.useState)("");
  const [listItems, setListItems] = (0, react_1.useState)([]);
  (0, react_1.useEffect)(() => {
    async function getData() {
      const applications = await findApplications(searchText);
      setListItems(applications);
    }
    getData();
  }, [searchText]);
  return (0, jsx_runtime_1.jsx)(api_1.List, {
    filtering: false,
    onSearchTextChange: setSearchText,
    navigationTitle: "Application",
    searchBarPlaceholder: "Application Name",
    children: listItems.map((i) =>
      (0, jsx_runtime_1.jsx)(
        api_1.List.Item,
        {
          title: i.name,
          actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, {
            children: (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Open", onAction: () => openApp(i.path) }),
          }),
          icon: {
            fileIcon: i.path,
            // source: `/Users/james/Pictures/wallpapers/whats-the-font-of-this-wallpaper-ignore-the-flair-didnt-v0-14e04ug5pm0a1.webp`
          },
        },
        i.bundleId,
      ),
    ),
  });
}
exports.default = default_1;
async function findApplications(name) {
  name = name.toLowerCase();
  const applications = await (0, api_1.getApplications)();
  return applications.filter((a) => a.name.toLowerCase().includes(name));
}
function openApp(path) {
  const cmd = (0, child_process_1.spawn)("open", ["-n", "-a", path]);
  cmd.on("close", async () => {
    await (0, api_1.closeMainWindow)({ clearRootSearch: true, popToRootType: api_1.PopToRootType.Immediate });
  });
}
