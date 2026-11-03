import {
  ListViewState,
  chooseListView,
  listIsLoading,
} from "../src/lib/list-view";
import { CaveatState, describeCaveat } from "../src/lib/status-line";

/**
 * Every state the result list can be in shows something.
 *
 * Three separate blank screens shipped from this decision while it was a nest
 * of ternaries inside a 1,300-line component. Enumerating the state space is
 * the point: the guarantee is not that the cases below are right, it is that
 * no combination of them returns nothing.
 */
export function listViewChecks(assert: (ok: boolean, label: string) => void) {
  console.log("\n=== what the list shows ===");

  const base: ListViewState = {
    rankingReady: true,
    visibleRows: 0,
    leaving: false,
    computing: false,
    directoryPending: false,
    tooShort: false,
    minQuery: 3,
    query: "",
    limitReached: false,
    noIndex: false,
  };

  // The exhaustive part: every combination of every flag.
  const booleans = [
    "rankingReady",
    "leaving",
    "computing",
    "directoryPending",
    "tooShort",
    "limitReached",
    "noIndex",
  ] as const;
  const strings = ["folderError", "locationError", "searchError"] as const;
  let checked = 0;
  let blanks = 0;
  let missingText = 0;
  let loadingWhileEmpty = 0;
  for (let mask = 0; mask < 1 << booleans.length; mask++) {
    for (let errors = 0; errors < 1 << strings.length; errors++) {
      for (const visibleRows of [0, 1, 100]) {
        for (const query of ["", "report"]) {
          const state: ListViewState = { ...base, visibleRows, query };
          booleans.forEach((key, i) => {
            state[key] = (mask & (1 << i)) !== 0;
          });
          strings.forEach((key, i) => {
            state[key] = (errors & (1 << i)) !== 0 ? "synthetic" : undefined;
          });
          const view = chooseListView(state);
          checked++;
          if (
            view.kind !== "rows" &&
            view.kind !== "empty" &&
            view.kind !== "loading"
          )
            blanks++;
          if (
            view.kind !== "rows" &&
            (view.title.trim() === "" || view.description.trim() === "")
          )
            missingText++;
          // Raycast withholds the empty view while the list is loading, so a
          // message that is not shown is the same as no message at all.
          if (view.kind !== "rows" && listIsLoading(view, true))
            loadingWhileEmpty++;
        }
      }
    }
  }
  assert(checked === 6144, `every combination is covered (${checked})`);
  assert(blanks === 0, `no state returns nothing to show (${blanks} did)`);
  assert(
    missingText === 0,
    `every non-row state carries a title and a description (${missingText} did not)`,
  );
  assert(
    loadingWhileEmpty === 0,
    `no state shows a message the loading bar would hide (${loadingWhileEmpty} did)`,
  );
  assert(
    listIsLoading({ kind: "rows" }, true) &&
      !listIsLoading({ kind: "rows" }, false),
    "a list with rows still shows progress while its stages settle",
  );

  // Rows win whenever anything will render, however unsettled the rest is.
  assert(
    chooseListView({ ...base, visibleRows: 1, directoryPending: true }).kind ===
      "rows",
    "a folder still being read shows the rows it has rather than hiding them",
  );
  assert(
    chooseListView({ ...base, visibleRows: 1, searchError: "boom" }).kind ===
      "rows",
    "so does a list that has rows despite a failed search",
  );
  assert(
    chooseListView({ ...base, visibleRows: 0, rankingReady: false }).kind ===
      "loading",
    "before the usage history loads there is nothing to rank",
  );

  // The cases the screenshots were.
  const folder = chooseListView({
    ...base,
    visibleRows: 0,
    directoryPending: true,
  });
  assert(
    folder.kind === "empty" && folder.title === "Reading folder…",
    `entering a folder says so rather than showing a blank screen (${folder.kind})`,
  );
  const everywhere = chooseListView({ ...base, visibleRows: 0, query: "" });
  assert(
    everywhere.kind === "empty" && everywhere.title === "Nothing to show yet",
    `an empty query with nothing to show says so (${everywhere.kind})`,
  );
  const noIndex = chooseListView({ ...base, visibleRows: 0, noIndex: true });
  assert(
    noIndex.kind === "empty" &&
      /Rebuild Search Index/u.test(noIndex.description),
    "with no index the message names the action that fixes it",
  );

  const leaving = chooseListView({
    ...base,
    leaving: true,
    query: "report",
    searchError: "boom",
  });
  assert(
    leaving.kind === "empty" && leaving.title === "Opening…",
    `a view being replaced says so rather than reporting the old scope (${leaving.kind})`,
  );
  assert(
    chooseListView({ ...base, leaving: true, visibleRows: 5 }).kind === "rows",
    "but rows that are still on screen keep rendering until they are replaced",
  );

  const computing = chooseListView({ ...base, computing: true, query: "x" });
  assert(
    computing.kind === "loading" && computing.title === "Ranking by usage…",
    `a list still being computed says so rather than reporting no match (${computing.kind})`,
  );
  assert(
    chooseListView({ ...base, computing: true, tooShort: true, query: "ab" })
      .kind === "loading",
    "and it outranks the character minimum, which describes a finished list",
  );
  assert(
    chooseListView({ ...base, computing: true, directoryPending: true })
      .kind === "empty",
    "but the folder read is the nearer reason while it is the stage running",
  );

  // Ordering between the reasons: the more specific one wins.
  assert(
    chooseListView({ ...base, directoryPending: true, tooShort: true }).kind ===
      "empty" &&
      (
        chooseListView({ ...base, directoryPending: true, tooShort: true }) as {
          title: string;
        }
      ).title === "Reading folder…",
    "a pending folder read outranks the character minimum, since it resolves on its own",
  );
  const short = chooseListView({ ...base, tooShort: true, query: "ab" });
  assert(
    short.kind === "empty" && short.hint === "keys",
    "the character minimum is the one state that hints at the keyboard",
  );
  assert(
    chooseListView({ ...base, folderError: "boom", noIndex: true }).kind ===
      "empty" &&
      (
        chooseListView({ ...base, folderError: "boom", noIndex: true }) as {
          title: string;
        }
      ).title === "Folder could not be read",
    "a read error outranks a missing index, because it is the nearer cause",
  );
}

/**
 * The status line says one thing, and which one is the whole decision.
 *
 * Several things can be incomplete at once; the priority order below is the
 * shipped order, so each case names the explanation that outranks the rest.
 */
export function caveatChecks(assert: (ok: boolean, label: string) => void) {
  console.log("\n=== which caveat the status line shows ===");

  const base: CaveatState = {
    dir: undefined,
    pathQuery: undefined,
    indexStatus: "ready",
    indexTooShort: false,
    coverage: undefined,
    query: "",
    searchLimitReached: false,
    visibleFolderError: undefined,
    locationError: undefined,
    searchError: undefined,
    omittedEntries: 0,
    resultsTruncated: false,
  };

  assert(
    describeCaveat(base) === undefined,
    "a settled search says nothing at all",
  );
  assert(
    describeCaveat({
      ...base,
      searchLimitReached: true,
      visibleFolderError: "boom",
      searchError: "nope",
      indexStatus: "failed",
    }) === "Search limit reached — narrow your query or search inside a folder",
    "the search limit outranks every other explanation",
  );
  assert(
    describeCaveat({
      ...base,
      visibleFolderError: "boom",
      locationError: "nope",
      searchError: "also",
    }) === "this folder could not be read",
    "a folder read error outranks the typed location and the index",
  );
  assert(
    describeCaveat({ ...base, locationError: "nope", searchError: "also" }) ===
      "this location could not be read",
    "the typed location's error outranks the search's",
  );
  assert(
    describeCaveat({
      ...base,
      searchError: "index query failed",
      indexStatus: "failed",
    }) === "index query failed",
    "a search error is reported verbatim, ahead of the index caveat",
  );
  assert(
    describeCaveat({ ...base, indexStatus: "failed", omittedEntries: 3 }) ===
      "The search index could not be read — rebuild it from Actions",
    "an unreadable index outranks a capped folder listing",
  );
  assert(
    describeCaveat({ ...base, indexStatus: "missing", query: "abc" }) ===
      "No search index yet — Rebuild Search Index in Actions",
    "a missing index asks for a rebuild once something is typed",
  );
  assert(
    describeCaveat({ ...base, indexStatus: "missing" }) === undefined,
    "a missing index stays quiet before anything is typed",
  );
  assert(
    describeCaveat({ ...base, dir: "/tmp", indexStatus: "failed" }) ===
      undefined,
    "a folder shows its children, so the index cannot be its excuse",
  );
  assert(
    describeCaveat({
      ...base,
      pathQuery: { dir: "/tmp" },
      indexStatus: "failed",
    }) === undefined,
    "the path bar does not query the index either",
  );
  assert(
    describeCaveat({
      ...base,
      indexTooShort: true,
      coverage: { status: "ready", roots: [], files: 4 },
    }) === undefined,
    "a term too short for the index reports nothing rather than coverage",
  );
  assert(
    describeCaveat({
      ...base,
      coverage: { status: "ready", roots: [], files: 4 },
    }) === "4 indexed · no indexed locations",
    "otherwise a ready index reports its coverage",
  );
  assert(
    describeCaveat({ ...base, omittedEntries: 1, resultsTruncated: true }) ===
      "Folder listing capped — some children were not read",
    "a capped folder listing outranks the generic truncation note",
  );
  assert(
    describeCaveat({ ...base, searchError: "" }) === undefined,
    "an empty error string is not an explanation",
  );
}
