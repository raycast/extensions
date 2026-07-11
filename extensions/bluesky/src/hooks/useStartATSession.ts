import { useEffect, useState } from "react";

import { SessionStartFailed } from "../utils/constants";
import { showDangerToast } from "../utils/common";
import { startATSession } from "../libs/atp";

const useStartATSession = (newSessionCreatedCallback: () => void) => {
  const [sessionStartFailed, setSessionStartFailed] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const startSession = async () => {
    const result = await startATSession();
    if (result.status === "new-session-created") {
      setSessionStarted(true);
      newSessionCreatedCallback();
    }

    if (result.status === "session-creation-failed") {
      const message = result.message || "An error occurred";
      setErrorMessage(message);
      setSessionStartFailed(true);
      showDangerToast(SessionStartFailed);

      return;
    }

    setSessionStarted(true);
  };

  useEffect(() => {
    startSession();
  }, []);

  return [sessionStarted, sessionStartFailed, errorMessage] as const;
};

export default useStartATSession;
