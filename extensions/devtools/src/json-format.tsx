import { useEffect, useState } from "react";
import { Detail } from "@raycast/api";
import { getClipboardText } from "./util/clipboard";

export default function main() {
  const [error, setError] = useState<Error>();
  const [prettyJSON, setPrettyJSON] = useState<string>();
  const [clipboard, setClipboard] = useState<string>("");

  useEffect(() => {
    async function formatJsonFromClipboard() {
      try {
        const clipboard = await getClipboardText();
        setClipboard(clipboard);

        const parsed = JSON.parse(clipboard);
        const stringified = JSON.stringify(parsed, null, 2);
        setPrettyJSON(stringified);
      } catch (error) {
        setError(error as Error);
      }
    }

    formatJsonFromClipboard();
  }, []);

  const markdown = `
~~~
${prettyJSON ?? error?.message}
~~~
  
## Clipboard
  
${clipboard}
`;

  return <Detail markdown={markdown} isLoading={!prettyJSON && !error} />;
}
