import { useEffect } from "react";

import { checkOpenInApp } from "../utils/openPage";

export function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkOpenInApp();
  }, []);

  return children;
}
