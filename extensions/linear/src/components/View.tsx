import { useEffect } from "react";
import { checkLinearApp } from "../helpers/isLinearInstalled";
import { withLinearClient } from "../helpers/withLinearClient";

/**
 * Makes sure that we have a authenticated linear client available in the children
 */
export default function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkLinearApp();
  }, []);

  return withLinearClient(children);
}
