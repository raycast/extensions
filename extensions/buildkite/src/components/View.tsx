import { withBuildkiteClient } from "../api/withBuildkiteClient";

/**
 * Makes sure that we have a authenticated Buildkite client available in the children
 */
export default function View({ children }: { children: JSX.Element }) {
  return withBuildkiteClient(children);
}
