import { ReactNode } from "react";
import { Detail } from "@raycast/api";
import { withSpotifyClient } from "../helpers/withSpotifyClient";

type ViewProps = {
  children: ReactNode;
};

function ViewComponent({ children }: ViewProps) {
  return <>{children}</>;
}

export const View = withSpotifyClient(ViewComponent);

export function ErrorView({ error }: { error: Error }) {
  const markdown = `# Error

${error.message}

Please try again later or check your Spotify connection.`;

  return <Detail markdown={markdown} />;
}
