import { Action, ActionPanel, Color, getPreferenceValues, List } from "@raycast/api";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useCachedPromise } from "@raycast/utils";
import { getOverview } from "./api/get-overview";
import { getRiskLevel, getUrl, riskLevelToColor, riskLevelToIcon } from "./utils";
import { Area } from "./types";
import { getForecast } from "./api/get-forecast";

function AreaDetail({ area }: { area: Area }) {
  const riskLevel = getRiskLevel(area);

  const { data, isLoading } = useCachedPromise(async () => {
    const content = await getForecast(area.slug);
    return content;
  }, []);

  const language = getPreferenceValues().language;

  const markdown = NodeHtmlMarkdown.translate(
    `<div>${data?.forecast?.assessmentContent}<br />
${
  language === "se"
    ? `<h2>${data?.forecast?.snowInfo.heading}</h2><br />
${data?.forecast?.snowInfo.content}</div><br />
<h2>${data?.forecast?.weatherInfo.heading}</h2>
<br />${data?.forecast?.weatherInfo.content}</div>`
    : "</div>"
}`,
  );

  const forecast = data?.forecast;

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={`## ${forecast?.assessmentHeading}\n\n${markdown}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={language === "en" ? "Area" : "Område"} text={area.areaName} />
          <List.Item.Detail.Metadata.Label title="" text={{ value: area.areas, color: Color.SecondaryText }} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={data?.avalancheHazardText || "Avalanche danger"}
            text={{
              value: `${area.riskText} (${riskLevel})`,
              color: riskLevelToColor(riskLevel),
            }}
            icon={{ source: getUrl(area.riskImage.src) }}
          />
          <List.Item.Detail.Metadata.Label
            title={forecast?.validFromPrefix?.replace(":", "") ?? "Valid from"}
            text={forecast?.validFrom}
          />
          <List.Item.Detail.Metadata.Label
            title={forecast?.validToPrefix?.replace(":", "") ?? "Valid to"}
            text={forecast?.validTo}
          />
          <List.Item.Detail.Metadata.Separator />
          {forecast?.avalancheProblem.problems.map((problem, index) => {
            return (
              <List.Item.Detail.Metadata.Label
                key={index}
                title={index === 0 ? problem.heading : ""}
                text={problem.description.title}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Overview() {
  const { data, isLoading } = useCachedPromise(async () => {
    const overview = await getOverview();
    return overview;
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for area…" isShowingDetail>
      {data?.forecastAreas.map((area) => {
        const riskLevel = getRiskLevel(area);
        if (!riskLevel || !area.riskText) {
          return null;
        }

        return (
          <List.Item
            icon={{ source: riskLevelToIcon(riskLevel), tintColor: riskLevelToColor(riskLevel) }}
            keywords={[area.areaName, area.areas]}
            key={area.url}
            title={{
              value: area.areaName,
              tooltip: area.areas,
            }}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={getUrl(area.url)} />
              </ActionPanel>
            }
            detail={<AreaDetail area={area} />}
          />
        );
      })}
    </List>
  );
}
