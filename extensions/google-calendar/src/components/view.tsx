import { withCalendarClient } from "@lib/withCalendarClient";

/**
 * Makes sure that we have a authenticated calendar client available in the children
 */
export default function View({ children }: { children: JSX.Element }) {
  return withCalendarClient(children);
}
