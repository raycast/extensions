import { AxiosError } from "axios";
import { List, Icon, Action, ActionPanel } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

import { CheckerResponse } from "@type";

type ErrorCode = "ECONNABORTED" | "ERR_BAD_RESPONSE" | "ECONNRESET" | "ENETDOWN" | "ENOTFOUND";

function getErrorMessage(errorCode: string | undefined) {
  if (!errorCode) {
    return {
      title: "Unexpected Error",
      description: "Unexpected error has occured. Please try again in a few minutes.",
    };
  }

  const errorMessage: Record<ErrorCode, { title: string; description: string }> = {
    ECONNABORTED: {
      title: "Request Timeout",
      description:
        "This might happen when the text contains a large amount of complex language or formatting. Please try splitting the text into smaller chunks and submitting them separately.",
    },
    ERR_BAD_RESPONSE: {
      title: "Invalid Response from Server",
      description:
        "The server did not provide a valid response. This could be due to a network issue, a server-side error, or an issue with the request itself. Please reload the extension and try again.",
    },
    ECONNRESET: {
      title: "Invalid Response from Server",
      description:
        "The server did not provide a valid response. This could be due to a network issue, a server-side error, or an issue with the request itself. Please reload the extension and try again.",
    },
    ENETDOWN: {
      title: "Sever is currently down",
      description:
        "The server did not provide a valid response. This happens when server is not responsive. Please try again later.",
    },
    ENOTFOUND: {
      title: "Oops, we can't seem to connect right now",
      description:
        "It looks like your internet connection might be down. Please check your internet connection and try again.",
    },
  };

  const { title, description } = errorMessage[errorCode as ErrorCode] || {
    title: "Unexpected Error",
    description: "Unexpected error has occured. Please try again in a few minutes.",
  };

  return { title, description };
}

interface ErrorViewProps {
  isLoading: boolean;
  errorCode: string | undefined;
  revalidate: () => Promise<CheckerResponse[] | AxiosError<unknown, any>>;
}

export default function ErrorView({ isLoading, errorCode, revalidate }: ErrorViewProps) {
  const { title, description } = getErrorMessage(errorCode);

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={title}
        description={description}
        icon={{
          source: Icon.ExclamationMark,
          tintColor: { light: "#f9645a", dark: "#71262c", adjustContrast: true },
        }}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={() => revalidate()} />

            <Action.OpenInBrowser
              title="Open Original Website"
              icon={getFavicon("http://speller.cs.pusan.ac.kr/")}
              url={"http://speller.cs.pusan.ac.kr/"}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
