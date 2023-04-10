import { ActionPanel, OpenInBrowserAction, List, showToast, ToastStyle, CopyToClipboardAction } from "@raycast/api";
import { useEffect, useState } from "react";
import convert from "xml-js";
import fetch from "node-fetch";

function Actions({ item }) {
  return (
    <ActionPanel title={item.title}>
      <ActionPanel.Section>
        <>
          {item.link && <OpenInBrowserAction url={item.link} />}
          {item.link && (
            <CopyToClipboardAction content={item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
          )}
        </>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [state, setState] = useState({});

  useEffect(() => {
    async function fetchStories() {
      try {
        let XMLdata = await fetch("http://static.cricinfo.com/rss/livescores.xml").then((r) => r.text());
        let JSONdata = JSON.parse(convert.xml2json(XMLdata, { compact: true, spaces: 4 }));
        let matches = JSONdata.rss.channel.item.map((match) => ({
          title: match.title["_text"].replace(" *", "*"),
          id: match.guid["_text"].replace(/\D+/g, ""),
          link: match.guid["_text"],
        }));
        for (let matchIndex in matches) {
          let indepthData = await fetch(
            `https://www.espncricinfo.com/matches/engine/match/${matches[matchIndex].id}.json`
          ).then((r) => r.json());
          matches[matchIndex].summary =
            indepthData.match.current_summary == ""
              ? indepthData.live.status
              : indepthData.match.current_summary.split("(")[1].replace(")", "");
          matches[matchIndex].icon =
            indepthData.match.current_summary != ""
              ? indepthData.team[0].team_id == indepthData.live.innings.batting_team_id
                ? "https://p.imgci.com" + indepthData.team[0].logo_image_path
                : "https://p.imgci.com" + indepthData.team[1].logo_image_path
              : "clock-16";
          if (matches[matchIndex].icon == "https://p.imgci.com") {
            matches[matchIndex].icon = "globe-16";
          }
        }
        setState({ items: matches });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error("Something went wrong") });
      }
    }

    fetchStories();
  }, []);
  if (state.error) {
    showToast(ToastStyle.Failure, "Failed loading matches", state.error.message);
  }
  return (
    <List isLoading={!state.items && !state.error}>
      {state.items?.map((match, index) => (
        <List.Item
          key={index}
          icon={match.icon}
          title={match.title}
          subtitle={match.summary}
          actions={<Actions item={match} />}
        />
      ))}
    </List>
  );
}
