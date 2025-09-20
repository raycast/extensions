import { Detail, Action, ActionPanel, Toast, showToast, popToRoot } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import * as cheerio from "cheerio";

export default function Command(props) {
  const { ID } = props.arguments;

  const [markdown, setMarkdown] = useState("");

  const splitArr = (array, size) =>
    Array.from({ length: Math.ceil(array.length / size) }, (value, index) =>
      array.slice(index * size, index * size + size)
    );
  let personalRecordInformation;
  let profileInfoMarkdown;

  useFetch(`https://www.worldcubeassociation.org/persons/${ID}`, {
    onData: (data) => {
      let $ = cheerio.load(data);
      let tableData = $("table")
        .text()
        .split("\n")
        .filter((x) => x.trim() !== "")
        .map((x) => x.trim());
      let avatar = $(".avatar").attr("src");
      let avatarImg = `![](https://images.weserv.nl/?url=${avatar}?v=4&h=150&w=150&fit=cover&mask=circle&maxage=7d)`;
      let country = tableData[5];
      let gender = tableData[7];
      let competitions = tableData[8];
      let completedSolves = tableData[9];
      profileInfoMarkdown = `\n# Profile Information 👤 \n| Country | WCA ID | Gender | Competitions | Solves |\n|---------|--------|--------|--------------|------------------|\n|${country}|${ID}|${gender}|${competitions}|${completedSolves}|`;

      let eventData = [];
      for (let el of tableData) {
        if (!["Competition", "Gold", "Silver", "Bronze"].includes(el)) eventData.push(el);
        else break;
      }

      let eventJSONs = splitArr(eventData.slice(19), 9).map((x) => ({
        event: x[0],
        single: {
          result: x[4],
          NR: x[1],
          CR: x[2],
          WR: x[3],
        },
        average: {
          result: x[5],
          NR: x[8],
          CR: x[7],
          WR: x[6],
        },
      }));
      let eventNameMap = {
        "2x2x2 Cube": "2x2",
        "3x3x3 Cube": "3x3",
        "4x4x4 Cube": "4x4",
        "5x5x5 Cube": "5x5",
        "6x6x6 Cube": "6x6",
        "7x7x7 Cube": "7x7",
        "3x3x3 One-Handed": "OH",
        Pyraminx: "Pyram.",
        "Square-1": "Sq-1",
      };
      personalRecordInformation = `\n## Current Personal Records 🏆 \n| Event | NR   | CR   | WR   | Single | Average | WR   | CR   | NR   |\n|-------|------|------|------|--------|---------|------|------|------|`;
      for (let eventJSON of eventJSONs) {
        personalRecordInformation += `\n|**${
          eventNameMap[eventJSON.event] ? eventNameMap[eventJSON.event] : eventJSON.event
        }**|_${eventJSON.single.NR}_|_${eventJSON.single.CR}_|_${eventJSON.single.WR}_|**${
          eventJSON.single.result
        }**|**${eventJSON.average.result}**|_${eventJSON.average.WR}_|_${eventJSON.average.CR}_|_${
          eventJSON.average.NR
        }_|`;
      }
      setMarkdown(avatarImg + profileInfoMarkdown + personalRecordInformation);
    },
    onError: () => {
      showToast({
        title: "WCA ID doesn't exist",
        style: Toast.Style.Failure,
      });
      popToRoot();
    },
  });

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser title="Open in Browser" url={`https://www.worldcubeassociation.org/persons/${ID}`} />

          <Action.CopyToClipboard title="Copy Cuber Info as Markdown Table" content={profileInfoMarkdown} />

          <Action.CopyToClipboard title="Copy ID" content={ID} />

          <Action.CopyToClipboard title="Copy Records as Markdown Table" content={personalRecordInformation} />
        </ActionPanel>
      }
    />
  );
}
