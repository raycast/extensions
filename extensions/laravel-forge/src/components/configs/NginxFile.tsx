import { Detail } from "@raycast/api";
import { IServer, ISite } from "../../types";
import { useConfig } from "../../hooks/useConfig";

export const NginxFile = ({ site, server }: { site: ISite; server: IServer }) => {
  const { fileString: markdown, loading, error } = useConfig({ type: "nginx", site, server });
  if (error) return <Detail markdown={`Error: ${error}`} />;
  if (loading) return <Detail markdown="Loading..." />;
  return <Detail markdown={"```sh\n" + markdown + "\n```"} />;
};
