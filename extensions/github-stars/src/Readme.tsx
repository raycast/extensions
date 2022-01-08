import { Detail } from "@raycast/api";
import { fetchReadme } from "fetch-readme";
import { useState, useEffect } from "react";

interface ReadmeProps {
  user: string;
  repo: string;
}

export const Readme = ({ user, repo }: ReadmeProps): JSX.Element => {
  const [readme, setReadme] = useState<string>("");
  useEffect(() => {
    fetchReadme(user, repo).then((response: string) => setReadme(response));
  }, []);

  return <Detail markdown={readme} />;
};
