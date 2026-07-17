/* eslint-disable no-irregular-whitespace */
import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import json2md from "json2md";
import { useMemo } from "react";
import { getMatchReports } from "../api";
import { Fixture } from "../types";

const article2md = (html?: string) => {
  const regex = /<(\w+).*?>(.*?)<\/\1>/g;
  const matches = html?.match(regex);

  const data: json2md.DataObject[] = [];
  matches?.forEach((line) => {
    const match = line.match(/<(\w+).*?>(.*?)<\/\1>/);
    if (match) {
      // convert a element to markdown format
      let text = match[2].replace(
        /<a href="([^"]+)"[^>]*>(.*?)<\/a>/g,
        `[$2]($1)`,
      );

      // fix incorrect format
      text = text
        .replace(/<strong> | <strong>/g, "\n<strong>")
        .replace(/: <\/strong>/g, ":</strong> ");
      data.push({ [match[1]]: text });
    }
  });

  return data;
};

export default function MatchReports(props: { match: Fixture; title: string }) {
  const { data, isLoading } = usePromise(getMatchReports, [
    props.match.matchId,
  ]);

  const reports = useMemo(() => {
    const content = data?.body;

    const standardArticleRegex =
      /<div class="standardArticle(?:[^"]*)">([\s\S]*?)<\/div>/;
    const standardArticleContent = content?.match(standardArticleRegex)?.[1];

    const json = article2md(standardArticleContent);
    json.unshift({ h2: "Report" });

    return json;
  }, [data]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${props.title} | Match Reports`}
      markdown={json2md(reports)}
    ></Detail>
  );
}
