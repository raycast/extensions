import { withLinearClient } from "./withLinear";

/**
 * Makes sure that we have a authenticated linear client available in the children
 */
export default function View({ children }: { children: JSX.Element }) {
  return withLinearClient(children);
}
