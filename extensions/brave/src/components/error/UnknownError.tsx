import { Detail } from "@raycast/api";
import { useEffect } from "react";
import { showError } from "@chrismessina/raycast-kit";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../../constants";

export function UnknownError({ error }: { error?: unknown }) {
  useEffect(() => {
    void showError(error, { title: DEFAULT_ERROR_TITLE });
  }, [error]);
  return <Detail markdown={UnknownErrorText} />;
}
