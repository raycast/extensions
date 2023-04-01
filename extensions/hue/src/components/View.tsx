import { withHueClient } from "../lib/withHueClient";

export default function View({ children }: { children: JSX.Element }) {
  return withHueClient(children);
}
