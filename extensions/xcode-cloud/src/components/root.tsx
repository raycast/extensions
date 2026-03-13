import { withClient } from "../helpers/client";

export default function Root({ children }: { children: JSX.Element }) {
  return withClient(children);
}
