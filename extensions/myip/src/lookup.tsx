import { ActionPanel, Detail, Action, useNavigation } from "@raycast/api";
import axios from "axios";
import * as cheerio from "cheerio";
import { useEffect, useState } from "react";
import { LoadingStatus } from ".";

let isLive = true;

export default function LookUp() {
  const [status, setStatus] = useState<LoadingStatus>("loading");
  const [data, setData] = useState("");
  const { pop } = useNavigation();

  useEffect(() => {
    async function getIp() {
      try {
        const { data } = await axios.get(`https://ipaddress.my`);

        const $ = cheerio.load(data);
        let temp = ``;

        $("tbody").each(function (index, item) {
          switch (index) {
            case 1:
              $("tr", item).each(function (index, item) {
                temp += `## ${$("td", item).first().text().trim().replace(":", "")}
`;
                temp += `${$("td", item).last().text().trim()}
`;
              });
              break;
            case 2:
              $("tr", item).each(function (index, item) {
                temp += `## ${$("td", item).first().text().trim().replace(":", "")}
`;
                temp += `${$("td", item).last().text().trim()}
`;
              });
              break;
            default:
              break;
          }
        });

        if (isLive) {
          setData(temp);
          setStatus("success");
        }
      } catch (error) {
        if (isLive) {
          setStatus("failure");
        }
      }
    }
    isLive = true;
    getIp();
    return () => {
      isLive = false;
    };
  }, []);

  return (
    <Detail
      isLoading={status === "loading"}
      navigationTitle="IP Lookup"
      markdown={data}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={"https://ipaddress.my"}
            onOpen={() => {
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
