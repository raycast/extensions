import fs from "node:fs";
import { transformSync } from "esbuild";
import { FolderNavigation } from "../src/lib/folder-navigation";

/** Exercise real folder transitions, cancellation, and obsolete callbacks. */
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
    function callbacks(searchText = "") {
      const scopeController = new AbortController();
      let active = true;
      const deps = {
        navigation,
        frameId: navigation.current.id,
        dir: navigation.current.dir,
        searchText,
        onReturnToStart: (id: number) => navigation.reset(id),
        useCallback: (run: unknown) => run,
        scopeController,
        setSearchActive: (value: boolean) => {
          active = value;
        },
        onNavigate: (id: number, dir: string, selected: string | undefined) =>
          navigation.navigate(id, dir, selected),
      };
      const result = new Function(
        ...Object.keys(deps),
        code + "\nreturn { navigate, returnToStart };",
      )(...Object.values(deps)) as {
        navigate: (dir: string, selected?: string) => void;
        returnToStart: () => void;
      };
      return { ...result, scopeController, active: () => active };
    }
    return { navigation, callbacks };
  }
  const f = fixture();
  const first = f.callbacks();
  first.navigate("/foo");
  assert(
    first.scopeController.signal.aborted && !first.active(),
    "entering a folder cancels the previous scope before replacing its results",
  );
  assert(
    f.navigation.current.dir === "/foo" &&
      f.navigation.current.selectedPath === undefined,
    "entering a folder does not restore an earlier selection",
  );
  const sameFolder = f.callbacks();
  const firstId = f.navigation.current.id;
  sameFolder.navigate("/foo");
  assert(
    f.navigation.current.id === firstId &&
      sameFolder.active() &&
      !sameFolder.scopeController.signal.aborted,
    "navigating to the current folder leaves its search active",
  );
  f.callbacks().navigate("/foo/bar");
  const stale = f.callbacks();
  stale.navigate("/foo", "/foo/bar");
  assert(
    f.navigation.current.dir === "/foo" &&
      f.navigation.current.selectedPath === "/foo/bar",
    "parent navigation selects the folder just left",
  );
  const parentId = f.navigation.current.id;
  stale.navigate("/foo/baz");
  assert(
    f.navigation.current.id === parentId,
    "obsolete navigation callbacks cannot change the active folder",
  );
  // Revisiting a path must not revive callbacks from its previous result view.
  f.callbacks().navigate("/foo/bar");
  stale.navigate("/foo/baz");
  assert(
    f.navigation.current.dir === "/foo/bar" &&
      f.navigation.current.selectedPath === undefined,
    "revisiting a folder starts fresh without reviving obsolete callbacks",
  );
  for (let i = 0; i < 100; i++) {
    f.callbacks().navigate("/foo", "/foo/bar");
    f.callbacks().navigate("/foo/bar");
  }
  f.callbacks().navigate("/foo", "/foo/bar");
  assert(
    f.navigation.current.dir === "/foo" &&
      f.navigation.current.selectedPath === "/foo/bar",
    "one hundred up/down cycles preserve parent-folder selection",
  );

  const scoped = fixture("/foo");
  scoped.callbacks().navigate("/foo/bar");
  scoped.callbacks().navigate("/foo", "/foo/bar");
  assert(
    scoped.navigation.current.dir === "/foo" &&
      scoped.navigation.current.selectedPath === "/foo/bar",
    "parent navigation works for a scoped command start",
  );
  const reset = scoped.callbacks("bar");
  reset.returnToStart();
  assert(
    scoped.navigation.current.dir === undefined &&
      scoped.navigation.current.selectedPath === undefined &&
      reset.scopeController.signal.aborted &&
      !reset.active(),
    "returning to start clears the folder and selection and cancels old work",
  );
  const resetId = scoped.navigation.current.id;
  reset.returnToStart();
  scoped.callbacks().returnToStart();
  assert(
    scoped.navigation.current.id === resetId,
    "stale resets and resets at the empty start screen are ignored",
  );
  const globalQuery = scoped.callbacks("bar");
  globalQuery.returnToStart();
  assert(
    scoped.navigation.current.id === resetId + 1 &&
      globalQuery.scopeController.signal.aborted,
    "returning from a global query starts a fresh result view",
  );
}
