import { Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { Connect } from "./connect-view";
import { currentKey } from "./session";

export default function Command() {
  const [state, setState] = useState<"checking" | "connected" | "needs-key">("checking");

  useEffect(() => {
    void currentKey().then((key) => setState(key ? "connected" : "needs-key"));
  }, []);

  if (state === "checking") return <Detail isLoading markdown="" />;
  if (state === "connected") {
    return (
      <Detail
        markdown={
          "# Connected to Kanso\n\nThis Raycast has a key. Revoke it under Kanso › Settings › Local API › Paired apps to disconnect."
        }
      />
    );
  }
  return <Connect onConnected={() => setState("connected")} />;
}
