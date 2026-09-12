import { withGithubClient } from "../helpers/withGithubClient";

/**
 * Makes sure that we have a authenticated github client available in the children
 */
export default function View({ children }: { children: JSX.Element }) {
  return withGithubClient(children);
}
