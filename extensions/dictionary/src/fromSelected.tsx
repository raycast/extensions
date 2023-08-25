import { getSelectedText, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { EntryList } from "./views";

const SeletctedCmd = () => {
  const [initQuery, setQuery] = useState<string>("");
  useEffect(() => {
    (async () => {
      try {
        const selectedText = await getSelectedText();
        setQuery(selectedText);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cannot get selected text",
          message: String(error),
        });
      }
    })();
  }, []);
  return <EntryList initQuery={initQuery} />;
};
export default SeletctedCmd;
