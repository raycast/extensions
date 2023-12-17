import { withWhoopClient } from "../helpers/withWhoopClient";

export function View({ children }: { children: JSX.Element }) {
  return withWhoopClient(children);
}
