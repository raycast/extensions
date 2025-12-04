import { Detail } from "@raycast/api";
import React from "react";
import { genreLabels, Program, serviceIdLabels } from "../types";
import { getFormattedDate } from "../utils";

export function ProgramDetail({ program }: { program: Program }): React.JSX.Element {
  const cast = parseAct(program.act);

  return (
    <Detail
      markdown={buildMarkdown(program)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Service"
            text={serviceIdLabels[program.service.id]}
            icon={`https:${program.service.logo_s.url}`}
          />
          <Detail.Metadata.Label
            title="Airtime"
            text={`${getFormattedDate(new Date(program.start_time), "HH:mm")} - ${getFormattedDate(new Date(program.end_time), "HH:mm")}`}
          />
          <Detail.Metadata.TagList title="Genres">
            {program.genres.map((genre) => {
              return <Detail.Metadata.TagList.Item key={genre} text={genreLabels[genre]} />;
            })}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {Object.keys(cast).map((role) => (
            <Detail.Metadata.TagList key={role} title={role}>
              {cast[role].map((name) => {
                return <Detail.Metadata.TagList.Item key={name} text={name} />;
              })}
            </Detail.Metadata.TagList>
          ))}
        </Detail.Metadata>
      }
    />
  );
}

function buildMarkdown(program: Program): string {
  const lines: string[] = [];

  lines.push(`## ${program.title}`);
  if (program.subtitle.length > 0 && program.subtitle !== program.content) {
    lines.push(`### ${program.subtitle}`);
  }
  lines.push("---");
  lines.push("\n");
  if (program.content.length > 0) {
    lines.push(program.content);
  } else {
    lines.push("No content available");
  }

  return lines.join("\n");
}

type Cast = {
  [role: string]: string[];
};

function parseAct(act: string): Cast {
  const matches = act.matchAll(/【(.*?)】/g);
  const roles = Array.from(matches, (match) => match[1]);

  const result: Cast = {};

  for (let i = 0; i < roles.length; i++) {
    result[roles[i]] = [];

    const startMarker = `【${roles[i]}】`;
    const endMarker = i === roles.length - 1 ? "$" : `【${roles[i + 1]}】`;
    const pattern = new RegExp(`${startMarker}(.*?)${endMarker}`);
    const matches = act.match(pattern);
    const extractedString = matches ? matches[1] : "";

    extractedString
      .split("，")
      .filter((name) => name.length > 0)
      .forEach((name) => result[roles[i]].push(name));
  }

  return result;
}
