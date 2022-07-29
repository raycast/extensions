import { Detail } from "@raycast/api";
import { IServer } from "../Server";
import { ISite } from "../Site";
import { useState, useEffect } from "react";
import { Site } from "../api/Site";

export const EnvironmentFile = ({ site, server }: { site: ISite; server: IServer }) => {
  const [markdown, setMarkdown] = useState<string>("Loading...");
  useEffect(() => {
    Site.getConfig("env", site, server).then((text) => setMarkdown(text ?? ""));
  }, []);
  return <Detail markdown={markdown} />;
};
