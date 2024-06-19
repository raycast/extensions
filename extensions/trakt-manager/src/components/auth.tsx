import { Toast, showToast } from "@raycast/api";
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { authorize } from "../lib/oauth";

const AuthContext = createContext<{ isAuthenticated: boolean }>({ isAuthenticated: false });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await authorize();
        setIsAuthenticated(true);
      } catch (e) {
        showToast({
          title: "Error authorizing",
          style: Toast.Style.Failure,
        });
      }
    })();
  }, []);

  return <AuthContext.Provider value={{ isAuthenticated }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
