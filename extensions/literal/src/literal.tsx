import { Detail, LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useContext, useState } from "react";
import { AuthContext, getToken, logout } from "./authContext";
import BookList from "./components/book-list";
import { ApolloProvider, useMutation } from "@apollo/client";
import client from "./utils/client";
import { LOG_IN } from "./mutations/login";

interface Preferences {
  email: string;
  password: string;
}

function Literal() {
  const { setToken, token } = useContext(AuthContext);

  const { email, password } = getPreferenceValues<Preferences>();

  const [login, { loading }] = useMutation(LOG_IN, {
    variables: {
      email,
      password,
    },
    onCompleted: (data) => {
      showToast({
        style: Toast.Style.Success,
        title: "Logged in successfully",
      });
      const { login } = data;
      LocalStorage.setItem("x-literal-token", login.token);
      setToken(login.token);
    },
    onError: (error) => {
      console.error(error);
    },
  });

  useEffect(() => {
    const attemptLogin = async () => {
      if (email && password && token) {
        return;
      } else {
        await login();
      }
    };

    attemptLogin();
  }, [email, password, login, token]);

  if (loading) {
    return <Detail isLoading />;
  }

  return <BookList />;
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
