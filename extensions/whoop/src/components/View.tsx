import { withWhoopClient } from "../helpers/withWhoopClient";

export const View = withWhoopClient(({ children }: { children: JSX.Element }) => {
  return children;
});
