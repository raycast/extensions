import { Toast, showToast } from "@raycast/api";
import { ReactNode, useMemo, useState } from "react";
import { authorize } from "../lib/oauth";

export const View = ({ children }: { children: ReactNode }) => {
  const [auth, setAuth] = useState(false);

  useMemo(() => {
    (async () => {
      try {
        await authorize();
        setAuth(true);
      } catch (e) {
        showToast({
          title: "Error authorizing with Trakt",
          style: Toast.Style.Failure,
        });
      }
    })();
  }, []);

  if (!auth) {
    return null;
  }

  return children;
};
