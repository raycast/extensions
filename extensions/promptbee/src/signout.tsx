import { ActionPanel, Action, Detail, showHUD } from "@raycast/api";
import { useState } from "react";
import { clearSession, getSession } from "./session";
import { API_BASE_URL } from "./constants";

export default function Logout() {
  const [done, setDone] = useState(false);

  async function handleLogout() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/signout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getSession()}`,
        },
      });
      console.log(res);
      if (!res.ok) throw new Error("Sign out failed");

      await clearSession();

      await showHUD("👋 You are signed out from PromptBee");
      setDone(true);
    } catch (err) {
      console.log(err);
      await showHUD("⚠️ Sign out failed");
    }
  }

  if (done) {
    return <Detail markdown="### 👋 You are signed out from PromptBee." />;
  }

  return (
    <Detail
      markdown="Do you want to sign out from **PromptBee**?"
      actions={
        <ActionPanel>
          <Action title="Sign out" onAction={handleLogout} />
        </ActionPanel>
      }
    />
  );
}
