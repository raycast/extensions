import { Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getURL } from "./util";
import axios from "axios";

interface QueryProps {
  input: string;
}

const WHOIS = (props: LaunchProps<{ arguments: QueryProps }>) => {
  const [data, setData] = useState<string | null>(null);

  const input = props.arguments.input; // Get the input directly from props

  useEffect(() => {
    const fetchData = async () => {
      let domainOrIp = input;

      // If no input is provided, fetch the URL from the frontmost browser
      if (!domainOrIp) {
        try {
          const currentUrl = await getURL();
          domainOrIp = new URL(currentUrl).hostname.replace("www.", "").toString();
        } catch (error) {
          console.error("Error fetching URL:", error);
          showToast({
            style: Toast.Style.Failure,
            title: "Error fetching URL",
            message: "Please make sure you have a browser open with a valid URL.",
          });

          return;
        }
      }

      console.log("useEffect triggered with:", domainOrIp);
      domainOrIp && fetcher(domainOrIp);
    };

    fetchData();
  }, [input]);

  const fetcher = async (domainOrIp: string) => {
    let markdown = `# [WHOIS](https://who.is/whois/${domainOrIp}) 🌐\n\n`;
    const isIp = domainOrIp ? /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(domainOrIp) : false;
    const isDomain = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(domainOrIp);
    const url = isIp ? `https://ipwho.is/${domainOrIp}` : `https://scraper.run/whois?addr=${domainOrIp}`;

    // Check if the input is a valid IP address or domain
    // If not, return an error message
    if (!isIp && !isDomain) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: "Please enter a valid domain or IP address.",
      });
      return;
    }

    try {
      const { data } = await axios.get(url, { timeout: 10000 }); // 10-second timeout

      for (const [key, value] of Object.entries(data)) {
        const header = key.charAt(0).toUpperCase() + key.slice(1);
        markdown += `# \`${header}\`\n`;

        if (typeof value === "object" && value !== null) {
          for (const [k, v] of Object.entries(value)) {
            markdown += `* **${k}**: ${v}\n\n`;
          }
        } else {
          markdown += `* ${value}\n\n`; // Print the value directly if it's not an object
        }
      }

      showToast({
        style: Toast.Style.Success,
        title: "Success",
        message: `Data fetched successfully from ${url}`,
      });

      // Error handling:
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Error fetching data",
        message: "Please try again later.",
      });
    }

    setData(markdown);
  };

  return <Detail markdown={data} isLoading={!data?.length} />;
};

export default WHOIS;
