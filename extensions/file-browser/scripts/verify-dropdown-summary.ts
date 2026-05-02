import {
  buildSummaryLabel,
  parseDropdownChange,
  sortValue,
  SUMMARY_VALUE,
  viewValue,
} from "../src/lib/components/contents/dropdown-state";

type ContentsViewMode = "list" | "grid";
type ContentsSortMode =
  | "name-asc"
  | "kind-asc"
  | "last-opened-asc"
  | "added-desc"
  | "added-asc"
  | "modified-asc"
  | "created-asc"
  | "size-asc"
  | "tags-asc";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

const currentView: ContentsViewMode = "list";
const currentSort: ContentsSortMode = "name-asc";

const change = parseDropdownChange(viewValue(currentView));
assert(change.type === "view", `same view reselection should produce view change, got ${change.type}`);
assert(change.type === "view" && change.value === currentView, `same view value should match`);

const label1 = buildSummaryLabel(currentView, currentSort);
const label2 = buildSummaryLabel(currentView, currentSort);
assert(label1 === label2, `summary label should be deterministic: "${label1}" vs "${label2}"`);

const summaryChange = parseDropdownChange(SUMMARY_VALUE);
assert(summaryChange.type === "summary", `summary value should produce summary change`);

const sortChange = parseDropdownChange(sortValue("kind-asc"));
assert(sortChange.type === "sort", `sort value should produce sort change`);
assert(sortChange.type === "sort" && sortChange.value === "kind-asc", `sort value should match`);

const viewChange = parseDropdownChange(viewValue("grid"));
assert(viewChange.type === "view", `view value should produce view change`);
assert(viewChange.type === "view" && viewChange.value === "grid", `view value should match`);
console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
