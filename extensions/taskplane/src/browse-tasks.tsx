import ChooseOrganization from "./ChooseOrganization";
import Login from "./Login";
import { AuthContext, getToken, logout } from "./lib";
import { Detail } from "@raycast/api";
import { useEffect, useContext, useState } from "react";

function App() {
  const { token } = useContext(AuthContext);

  return token ? <ChooseOrganization /> : <Login />;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string>();

  useEffect(() => {
    (async () => {
      const localStorageToken = await getToken();

      if (localStorageToken) {
        setToken(localStorageToken);
      }

      setIsLoading(false);
    })();
  }, []);

  if (isLoading) {
    return <Detail isLoading />;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        setToken: (value) => {
          setToken(value);

          if (!value) {
            logout();
          }
        },
      }}
    >
      <App />
    </AuthContext.Provider>
  );
}
