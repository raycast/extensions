import { Detail } from "@raycast/api";
import { ConfigFile, IServer, ISite } from "../../types";
import { useConfig } from "../../hooks/useConfig";

export const LogFile = ({ site, server, type }: { site: ISite; server: IServer; type: ConfigFile }) => {
  const { fileString: markdown, loading, error } = useConfig({ type, site, server });
  if (error) return <Detail markdown={`Error: ${error}`} />;
  if (loading) return <Detail markdown="Loading..." />;
  return <Detail markdown={markdown ? "```sh\n" + markdown + "\n```" : "This log is empty."} />;
};
