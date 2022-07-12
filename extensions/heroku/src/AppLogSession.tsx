import { Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import useSWR from "swr";
import heroku, { simplifyCustomResponse } from "./heroku";
import https from "https";

export default function AppLogSession({ appId }: { appId: string }) {
  const { data, error, isValidating } = useSWR(["log-sessions", appId], () =>
    heroku.requests.createLogDrain({ params: { appId }, body: { tail: true, lines: 50 } }).then(simplifyCustomResponse)
  );

  const [content, setContent] = useState<string>("");

  useEffect(() => {
    if (data?.logplex_url) {
      const logRequest = https.get(data.logplex_url);

      logRequest.on("response", (response) => {
        response.on("data", (chunk) => {
          const newContent = chunk.toString();
          setContent((c) => c + newContent);
        });
      });

      logRequest.on("error", (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: error.message,
        });
      });
    }
  }, [data?.logplex_url]);

  return (
    <Detail
      navigationTitle="Log Session"
      isLoading={isValidating}
      markdown={
        data && !isValidating
          ? `\`\`\`output
${content}
\`\`\``
          : ""
      }
    />
  );
}
