import { withAccessToken } from "@raycast/utils";

import { filterIssues } from "../api/getIssues";
import { linear } from "../api/linearClient";

export default withAccessToken(linear)(async (inputs: {
  /**
   * Filter object.
   *
   * Examples:
   * To return all urgent and high priority issues in the workspace, you can use the following query:
   * {
   *  priority: { lte: 2, neq: 0 }
   * }
   * The above query will also return any issues that haven't been given any priority (their priority is 0). To exclude them, you can add another not equals comparator:
   * {
   *   priority: { lte: 2, neq: 0 }
   * }
   *
   * # Comparators
   * You can use the following comparators on string, numeric, and date fields:
   * `eq` – Equals the given value
   * `neq` – Doesn't equal the given value
   * `in` – Value is in the given collection of values
   * `nin` – Value is not in the given collection of values
   *
   * Numeric and date fields additionally have the following comparators:
   * `lt` – Less than the given value
   * `lte` – Less than or equal to the given value
   * `gt` – Greater than then given value
   * `gte` – Greater than or equal to the given value
   *
   * String fields additionally have the following comparators:

  * `eqIgnoreCase` – Case insensitive `eq`
  * `neqIgnoreCase` – Case insensitive `neq`
  * `startsWith` – Starts with the given value
  * `notStartsWith` – Doesn't start with the given value
  * `endsWith` – Ends with the given value
  * `notEndsWith` – Doesn't end with the given value
  * `contains` – Contains the given value
  * `notContains` – Doesn't contain the given value
  * `containsIgnoreCase` – Case insensitive `contains`
  * `notContainsIgnoreCase` – Case insensitive `notContains`
  *
  * Logical operators
  * By default, all fields described in the filter need to be matched. The filter merges all the conditions together using a logical and operator.
  * For example, The below example will find all urgent issues that are due in the year 2021:
  * {
  *  priority: { eq: 1 }
  *  dueDate: { lte: "2021" }
  * }
  *
  * List of all available fields for filtering:
  * id
  * identifier
  * title
  * branchName
  * priority
  * priorityLabel
  * estimate
  * dueDate
  * updatedAt
  * url
  * number
  *
  * Filtering by relationship
  * Data can also be filtered based on their relations. For example, you can filter issues based on the properties of their assignees. To query all issues assigned to a user with a particular email address, you can execute the following query:
  * {
  * assignee: { email: { eq: "john@linear.app" } }
  * }
  *
  * Many-to-many relationships can be filtered similarly. The following query will find issues that have the Bug label associated.
  * {
  *   labels: { name: { eq: "Bug" } }
  * }
  *
  * List of all available relation fields for filtering:
  * labels {
  *   id
  *    name
  *    color
  *  }
  *  state {
  *    id
  *    type
  *    name
  *    color
  *  }
  *  assignee {
  *    id
  *    displayName
  *    email
  *    avatarUrl
  *  }
  *  team {
  *    id
  *  }
  *  cycle {
  *    id
  *    number
  *    startsAt
  *    endsAt
  *    completedAt
  *  }
  *  parent {
  *    id
  *    title
  *    number
  *  }
  *  project {
  *    id
  *    name
  *    icon
  *    color
  *  }
  *  projectMilestone {
  *    id
  *    name
  *  }
  *
  * If user doesn't provide another instructions, always search for open issues (that are not closed, cancelled or done)
  *
  * IMPORTANT: Do not try to filter by fields or relations that are not listed above.
  * If you're asked to filter by other fields, just tell that you can't do it.
  *
  * IMPORTANT: Format filter as a JSON string
  * IMPORTANT: When user asks about my issues (assigned to me, my issues, etc), always filter by assignee.
  */
  filter: string;
}) => {
  return (await filterIssues(inputs.filter)).issues;
});
