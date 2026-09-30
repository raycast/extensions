import { Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getSession } from "./utils/api";
import { ErrorResponse, GetSessionResponse } from "./types";
import ErrorComponent from "./components/ErrorComponent";
import InvalidUrlComponent from "./components/InvalidUrlComponent";
import { isInvalidUrl } from "./utils/functions";

export default function GetSession(props: LaunchProps<{ arguments: Arguments.Session }>) {
  if (isInvalidUrl()) return <InvalidUrlComponent />;

  const { ip, session_id } = props.arguments;

  const [isLoading, setIsLoading] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState<ErrorResponse>();

  async function getFromApi() {
    setIsLoading(true);
    const response = await getSession({ ip, session_id });
    if (response.error === "0") {
      const data = response as GetSessionResponse;
      setMarkdown(`Username: ${data.username}

Password: ${data.password}

User Type: ${data.usertype}`);
      await showToast(Toast.Style.Success, "SUCCESS", "Fetched Session");
    } else {
      setError(response as ErrorResponse);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    getFromApi();
  }, []);

  return error ? <ErrorComponent errorResponse={error} /> : <Detail isLoading={isLoading} markdown={markdown} />;
}
