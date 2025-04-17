import { Search, SearchResults } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

type Input = {
  searchQuery: string;
};

/**
 * A Shortcut Search Query string used to filter and find Stories, Epics, and Objectives.
 *
 * Shortcut's search allows users to locate work items based on their attributes using specific operators and keywords. Queries primarily target Story titles, descriptions, and comments. This documentation provides a reference for the search syntax, supported operators, filtering logic, and examples.
 *
 * Search Logic:
 * - By default, multiple operators or terms in a query are combined using AND logic.
 * - OR logic is not currently supported directly within the search query string (though it may be available in UI filters).
 * - Free text search (without specific operators) targets Story titles, descriptions, and comments.
 *
 * Basic Structure:
 * Queries are typically composed of operators followed by values, often separated by a colon:
 * operator:value
 * Example: state:"Ready for Dev"
 * Some operators act as boolean flags:
 * is:blocker
 * Free text can also be included:
 * backend fix state:completed
 *
 * Operator Categories:
 * Operators fall into two main categories:
 * 1. Story-Specific Operators: Find results only for Stories (e.g., `type:`, `estimate:`).
 * 2. General Operators: Find results across Stories, Epics, and Objectives (e.g., `id:`, `title:`, `owner:`).
 *
 * Supported Operators and Fields:
 *
 * Content Search:
 * - (Free Text): Searches Story titles, descriptions, and comments. `hello world` searches for "hello" AND "world" anywhere in those fields.
 * - title: Searches Story, Epic, Objective, and Iteration titles.
 *   - `title:hello` searches for "hello".
 *   - `title:"hello world"` searches for the exact phrase "hello world".
 *   - `title:hello world` searches for "hello" in titles AND "world" in titles/descriptions/comments.
 * - description: Searches Story, Epic, and Objective descriptions. Behaves like `title:` regarding multiple words/quotes.
 * - comment: Searches Story and Epic comments. Behaves like `title:` regarding multiple words/quotes.
 *
 * Item Identification & Type:
 * - id: Finds an item by its numeric ID (e.g., `id:123`). Applies to Stories, Epics, Objectives.
 * - type: [Story-Specific] Finds Stories of a specific type (`feature`, `bug`, or `chore`). Only one `type:` operator per query. `type:bug`
 * - is:story: Returns only Stories.
 * - is:epic: Returns only Epics.
 *
 * Attributes & Classification:
 * - estimate: [Story-Specific] Finds Stories with a specific point estimate. `estimate:4`
 * - state: Finds Stories in a specific Workflow state. Use quotes for multi-word states. `state:"In Development"`
 * - label: Finds Stories or Epics with a specific label. Use quotes for multi-word labels. `label:"needs review"` (Note: Stories don't inherit Epic labels).
 * - project: Finds Stories in a specific Project (name or ID), or Epics containing Stories in that Project. Use quotes for multi-word names. `project:frontend` (Note: Projects is a Legacy feature).
 * - epic: Finds Stories within a specific Epic (name or ID). Use quotes for exact matches. `epic:"Q3 Launch"`
 * - objective: Finds Stories in Epics linked to a specific Objective. Use quotes for multi-word names. `objective:"Increase Engagement"`
 * - team: Finds Stories, Epics, and Iterations associated with a specific Team (use Team Name, not @-mention). `team:"Core Platform"` `team:"Product Development"`
 *
 * User Involvement:
 * - owner: Finds Stories or Epics owned by a specific user (@-mention name without the '@'). `owner:janedoe`
 * - requester: Finds Stories or Epics requested by a specific user (@-mention name without the '@'). `requester:johnsmith`
 *
 * Relationships & Status:
 * - is:blocked: [Story-Specific] Finds Stories marked as blocked by another Story.
 * - is:blocker: [Story-Specific] Finds Stories marked as blocking another Story.
 * - has:epic: [Story-Specific] Finds Stories that have been added to an Epic.
 *
 * Existence Checks (`has:`):
 * - has:attachment: [Story-Specific] Finds Stories with file attachments (not inline images).
 * - has:task: [Story-Specific] Finds Stories with tasks.
 * - has:comment: Finds Stories with comments.
 * - has:label: Finds Stories with any label.
 * - has:deadline: Finds Stories with a due date set.
 * - has:owner: Finds Stories with an owner assigned.
 *
 * Boolean States (`is:`):
 * - is:unstarted: Finds Stories in an "Unstarted" workflow state type.
 * - is:started: Finds Stories in a "Started" workflow state type.
 * - is:done: Finds Stories in a "Done" workflow state type.
 * - is:unestimated: Finds Stories with a point estimate of 0.
 * - is:overdue: Finds Stories whose due date is in the past.
 * - is:archived: Finds archived Stories.
 *
 * VCS Integration:
 * - has:branch: [Story-Specific] Finds Stories with any associated VCS branch.
 * - has:commit: [Story-Specific] Finds Stories with any associated VCS commit.
 * - has:pr: [Story-Specific] Finds Stories with any associated VCS pull request.
 * - branch: [Story-Specific] Finds Stories associated with a VCS branch by name. `branch:feature/new-login`
 * - commit: [Story-Specific] Finds Stories associated with a VCS commit by full hash or URL. `commit:a1b2c3d4`
 * - pr: [Story-Specific] Finds Stories associated with a VCS pull request by number or URL. `pr:123`
 *
 * Custom Fields (Shortcut Defined Only):
 * - skill-set: Filters by the 'Skill Set' custom field value.
 * - product-area: Filters by the 'Product Area' custom field value.
 * - technical-area: Filters by the 'Technical Area' custom field value.
 * - priority: Filters by the 'Priority' custom field value.
 * - severity: Filters by the 'Severity' custom field value.
 *   *Note: Advanced (user-created) Custom Fields are not searchable via operators at this time.*
 *
 * Date-Based Filtering:
 * - Date Format: Use `YYYY-MM-DD`.
 * - Date Ranges: Use `..` between dates: `YYYY-MM-DD..YYYY-MM-DD`.
 * - Open-Ended Ranges: Use `*`: `*..YYYY-MM-DD` (before), `YYYY-MM-DD..*` (after).
 * - Keywords: `today`, `yesterday`. `tomorrow` (only for `due:`). Cannot mix keywords and YYYY-MM-DD dates in a range.
 * - created: Filters by creation date/range. `created:2023-10-01..2023-10-31` `created:yesterday`
 * - updated: Filters by last updated date/range. `updated:2023-11-01..*`
 * - completed: Filters by completion date/range. `completed:today`
 * - moved: Filters by date/range the Story changed workflow state. `moved:*..2023-09-30`
 * - due: Filters by due date/range. `due:tomorrow` `due:2023-12-25`
 *
 * Combining Conditions & Negation:
 * - AND (Default): Multiple terms/operators are implicitly joined by AND. `bug label:critical owner:janedoe` finds critical bugs owned by janedoe.
 * - NOT (Exclusion): Prefix an operator with `!` or `-` to negate it.
 *   Example: `!has:comment` finds Stories with no comments.
 *   Example: `-label:critical` finds Stories without the "critical" label.
 * - OR: Not supported directly in search queries.
 * - Quoting: Use double quotes `"` around multi-word values for operators like `state:`, `label:`, `project:`, `epic:`, `objective:`, `team:`, and for exact phrase matching in `title:`, `description:`, `comment:`.
 *
 * Sorting Results:
 * Sorting is not controlled via the search query string itself. Result order depends on Shortcut's ranking, and pagination tokens should be used for stable results across pages.
 *
 * Examples of Shortcut Search Queries:
 * 1. Find all bugs assigned to me:
 *   `type:bug owner:myusername`
 * 2. Find features in the "Mobile App" project that are not done:
 *   `type:feature project:"Mobile App" !is:done`
 * 3. Find stories with the "urgent" label updated since the start of the month:
 *   `label:urgent updated:YYYY-MM-01..*` (replace YYYY-MM with current year/month)
 * 4. Find stories mentioning "database migration" in comments or description, requested by johnsmith:
 *   `"database migration" requester:johnsmith`
 * 5. Find stories without an estimate in the "Ready for Dev" state:
 *   `is:unestimated state:"Ready for Dev"`
 * 6. Find stories due today or tomorrow:
 *   `due:today OR due:tomorrow` (Note: This conceptual OR needs two separate queries or UI filtering, as OR is not supported in one query string)
 *   *Actual Queries:* `due:today` and `due:tomorrow` run separately.
 * 7. Find stories that are blockers and are overdue:
 *   `is:blocker is:overdue`
 * 8. Find epics related to the "Q4 Goals" objective:
 *   `is:epic objective:"Q4 Goals"`
 * 9. Find stories with attached PRs but no comments:
 *   `has:pr !has:comment`
 * 10. Find chores created yesterday:
 *    `type:chore created:yesterday`
 *
 * Special Considerations:
 * - Quoting: Essential for multi-word values in many operators and for exact phrase searches.
 * - Legacy Features: `project:` operator relates to a legacy feature.
 * - Custom Fields: Only specific, predefined custom fields are searchable with operators.
 * - User Mentions: Use the `@`-name *without* the `@` for `owner:` and `requester:`.
 *
 * Limitations:
 * - No OR logic combinator within a single query string.
 * - No direct sorting control via the query string.
 * - Limited searchability for user-created custom fields.
 *
 * Example Query Strings:
 * `"state:\"Ready for Dev\" owner:leetHacker !label:\"needs design\""`
 * `"type:chore updated:today"`
 * `"is:overdue project:\"Mobile App\""`
 * `"epic:\"User Authentication\" has:pr"`
 *
 * IMPORTANT: For general discovery, starting with free text search combined with key operators like `state:`, `owner:`, `type:`, or `label:` is often most effective. Remember to use quotes for multi-word values.
 */
const tool = async (input: Input) => {
  const { searchQuery } = input;

  if (!searchQuery) {
    return { data: null, searchQuery };
  }

  return shortcut
    .search({ query: searchQuery } as Search)
    .then((response) => {
      const searchResultData: SearchResults = response.data;
      return { data: searchResultData, searchQuery };
    })
    .catch((error: any) => {
      console.error(`Search tool failed for query "${searchQuery}":`, error);
      return { error: error?.message ?? "An unknown search error occurred", searchQuery };
    });
};

export default tool;
