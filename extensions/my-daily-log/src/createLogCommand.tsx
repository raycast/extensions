import { Form, LaunchProps, popToRoot, showHUD } from "@raycast/api";
import { useEffect, useRef } from "react";
import { LogForm } from "./components/LogForm";
import { showErrorToast } from "./components/errors";
import { refreshReminder } from "./components/refreshReminder";
import { NewDailyLog } from "./domain/dailyLog/NewDailyLog";
import { createNewLogUseCaseFactory } from "./factories/useCases";

export default function Command(props: LaunchProps<{ arguments: Arguments.CreateLogCommand }>) {
  const argumentTitle = props.arguments.title?.trim();
  const didCreate = useRef(false);

  useEffect(() => {
    if (!argumentTitle || didCreate.current) {
      return;
    }
    didCreate.current = true;
    (async () => {
      try {
        createNewLogUseCaseFactory().execute(new NewDailyLog(argumentTitle, new Date()));
        await refreshReminder();
        await showHUD(`Logged: ${argumentTitle}`);
        await popToRoot({ clearSearchBar: true });
      } catch (error) {
        await showErrorToast("Could not save the log", error);
      }
    })();
  }, [argumentTitle]);

  if (argumentTitle) {
    return <Form isLoading />;
  }
  return <LogForm />;
}
