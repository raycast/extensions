import { Detail, LaunchProps } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";

interface Props {
  domain: string;
}

const WHOIS = (props: LaunchProps<{ arguments: Props }>) => {
  const [data, setData] = useState<string | null>(null);
  const { domain } = props.arguments;

  useEffect(() => {
    fetcher();
  }, []);

  function getCleanDomain(rawDomain) {
    try {
      // Assume "http://" if no protocol is provided in rawDomain
      if (!rawDomain.match(/^[a-zA-Z]+:\/\//)) {
        rawDomain = 'http://' + rawDomain;
      }
      const url = new URL(rawDomain);
      return url.hostname;
    } catch (error) {
      console.log("Failed to parse domain:", error);
      return rawDomain;
    }
  }
  
  const fetcher = async () => {
    let markdown = `# WHOIS 🌐\n`;
    domain = getCleanDomain(domain);
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
