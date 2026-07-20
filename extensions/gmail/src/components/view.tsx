import { withGmailClient } from "../lib/withGmailClient";
import { ReactElement } from "react";

export default function View({ children }: { children: ReactElement }) {
  return withGmailClient(children);
}
