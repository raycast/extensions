import fs from "node:fs";
import { transformSync } from "esbuild";
import { FolderNavigation, FolderResume } from "../src/lib/folder-navigation";

/** Exercise real navigation callbacks and their lightweight history. */
export async function navigationStackChecks(
  assert: (ok: boolean, label: string) => void,
) {
  const source = fs.readFileSync("src/components/browser.tsx", "utf8");
  const code = transformSync(
    source.slice(
      source.indexOf("  const navigate ="),
      source.indexOf("  const scopeCandidates ="),
    ),
    { loader: "tsx" },
  ).code;
  function fixture(startDir?: string) {
    const navigation = new FolderNavigation(startDir);
    function callbacks(query = "", selectedPath?: string) {
      const scopeController = new AbortController();
      let active = true;
      const deps = {
        navigation,
        frameId: navigation.current.id,
        useCallback: (run: unknown) => run,
        scopeController,
        searchText: query,
        selectionPathRef: { current: selectedPath },
        setSearchActive: (value: boolean) => {
          active = value;
        },
        onNavigate: (
          id: number,
          dir: string,
          selected: string | undefined,
          resume: FolderResume,
        ) => navigation.navigate(id, dir, selected, resume),
        onBack: (id: number) => navigation.back(id),
      };
      const result = new Function(
        ...Object.keys(deps),
        code + "\nreturn { navigate, goBack };",
      )(...Object.values(deps)) as {
        navigate: (dir: string, selected?: string) => void;
        goBack: () => void;
      };
      return { ...result, scopeController, active: () => active };
    }
    return { navigation, callbacks };
  }
  const f = fixture();
  const first = f.callbacks("foo", "/foo");
  first.navigate("/foo");
  assert(
    first.scopeController.signal.aborted && !first.active(),
    "entering a folder cancels the previous scope before replacing its results",
  );
  assert(
    f.navigation.current.dir === "/foo" && f.navigation.current.query === "",
    "a new folder starts with an empty query in the same navigation model",
  );
  f.callbacks("bar", "/foo/bar").navigate("/foo/bar");
  const stale = f.callbacks();
  stale.navigate("/foo", "/foo/bar");
  assert(
    f.navigation.current.query === "bar" &&
      f.navigation.current.selectedPath === "/foo/bar",
    "parent navigation restores its query and selects the folder just left",
  );
  const parentId = f.navigation.current.id;
  stale.navigate("/foo/baz");
  stale.goBack();
  assert(
    f.navigation.current.id === parentId,
    "obsolete navigation and Back callbacks cannot change the active folder",
  );
  // Revisit the same folder: old callbacks must stay invalid after restoration.
  f.callbacks().navigate("/foo/bar");
  stale.navigate("/foo/baz");
  assert(
    f.navigation.current.dir === "/foo/bar",
    "returning to a folder does not revive its old navigation callbacks",
  );
  for (let i = 0; i < 100; i++) {
    f.callbacks().navigate("/foo", "/foo/bar");
    f.callbacks("bar", "/foo/bar").navigate("/foo/bar");
  }
  f.callbacks().goBack();
  assert(
    f.navigation.current.dir === "/foo",
    "one hundred up/down cycles retain one parent history entry",
  );
  const back = f.callbacks();
  back.goBack();
  assert(
    back.scopeController.signal.aborted &&
      f.navigation.current.dir === undefined &&
      f.navigation.current.query === "foo" &&
      f.navigation.current.selectedPath === "/foo",
    "Back cancels the old scope and restores the starting query and selection",
  );
  assert(
    !f.navigation.canGoBack,
    "Back cannot leave the starting history entry",
  );

  const capped = fixture();
  capped.callbacks("foo", "/foo").navigate("/foo");
  for (const dir of ["/foo/bar", "/foo/bar/baz", "/foo/bar/baz/qux"])
    capped.callbacks().navigate(dir);
  let backCount = 0;
  while (capped.navigation.canGoBack) {
    capped.callbacks().goBack();
    backCount++;
  }
  assert(
    backCount === 4,
    "history retains five locations including the starting search",
  );

  capped.callbacks("foo", "/foo").navigate("/foo");
  for (const dir of [
    "/foo/bar",
    "/foo/bar/baz",
    "/foo/bar/baz/qux",
    "/foo/bar/baz/qux/quux",
  ])
    capped.callbacks().navigate(dir);
  capped.callbacks().goBack();
  assert(
    capped.navigation.current.dir === undefined &&
      capped.navigation.current.query === "foo" &&
      !capped.navigation.canGoBack,
    "navigation beyond five locations discards old folders and Back returns to the start",
  );

  for (let i = 0; i < 100; i++) {
    capped.callbacks().navigate(`/foo/bar${i}`);
    const copy = JSON.parse(JSON.stringify(capped.navigation)) as {
      frames: Record<string, unknown>[];
    };
    assert(
      copy.frames.length <= 5 &&
        copy.frames.every((frame) =>
          Object.values(frame).every(
            (value) => typeof value === "string" || typeof value === "number",
          ),
        ),
      `navigation ${i + 1} retains at most five locations containing only strings and IDs`,
    );
  }
  const scoped = fixture("/foo");
  scoped.callbacks("bar", "/foo/bar").navigate("/foo/bar");
  scoped.callbacks().navigate("/foo", "/foo/bar");
  assert(
    !scoped.navigation.canGoBack &&
      scoped.navigation.current.selectedPath === "/foo/bar",
    "a scoped starting folder restores its root selection without adding history",
  );
}
