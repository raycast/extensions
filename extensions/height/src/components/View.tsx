import { useEffect } from "react";

import { withHeightAuth } from "@/components/withHeightAuth";
import { checkHeightApp } from "@/utils/application";

export default function View({ children }: { children: JSX.Element }) {
  useEffect(() => {
    checkHeightApp();
  }, []);

  return withHeightAuth(children);
}
