import { List, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import LoginForm from "./LoginForm";

export default function AuthWrapper({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  async function checkAuthStatus() {
    setLoading(true);
    const accountsString = await LocalStorage.getItem("accounts");
    if (accountsString) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
    setLoading(false);
  }

  useEffect(() => {
    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <List>
        <List.EmptyView title="Loading..." />
      </List>
    );
  }

  return isLoggedIn ? children : <LoginForm destination={children} />;
}
