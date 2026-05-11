import { withWPCOMClient } from "../helpers/withWPCOMClient";

/**
 * Makes sure that we have a authenticated github client available in the children
 */
export default function Auth({ children }: { children: JSX.Element }) {
  return withWPCOMClient(children);
}
