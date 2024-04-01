import { Detail } from "@raycast/api";
import { useEffect, useContext, useState } from "react";
import Login from "./login";
import { AuthContext, getToken, logout } from "./authContext";
import BookList from "./components/book-list";
import { ApolloProvider } from "@apollo/client";
import client from "./utils/client";

function Literal() {
  const { token } = useContext(AuthContext);

  return token ? <BookList /> : <Login />;
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
    <ApolloProvider client={client}>
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
        <Literal />
      </AuthContext.Provider>
    </ApolloProvider>
  );
}
