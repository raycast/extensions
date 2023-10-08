import { Detail, LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import axios from "axios";
import { useEffect, useState } from "react";
import { getURL } from "./util";

interface Props {
  domain: string;
}

const WHOIS = (props: LaunchProps<{ arguments: Props }>) => {
  const [data, setData] = useState<string | null>(null);
  const { data: domain } = usePromise(async () => {
    if (props.arguments.domain) {
      return props.arguments.domain;
    } else {
      const currentUrl = await getURL();
      if (!currentUrl) {
        return null;
      }
      return new URL(currentUrl).hostname.replace("www.", "").toString();
    }
  });
  useEffect(() => {
    domain && fetcher();
  }, [domain]);

  const fetcher = async () => {
    let markdown = `# WHOIS 🌐\n`;
    const url = "https://scraper.run/whois?addr=" + domain;

    try {
      const { data } = await axios.get(url);

      for (const [key, value] of Object.entries(data)) {
        const header = key.charAt(0).toUpperCase() + key.slice(1);
        markdown += `## ${header}\n`;

        for (const [k, v] of Object.entries(value as object)) {
          markdown += `* ${k}: ${v}\n\n`;
        }
      }
    } catch (error) {
      console.log(error);
    }

    setData(markdown);
  };

  return <Detail markdown={data} isLoading={!data?.length} />;
};

export default WHOIS;
