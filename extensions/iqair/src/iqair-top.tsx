import { Action, ActionPanel, Detail, Icon, List, Color } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { fetchIQAirTopCities, fetchIQAirCityDetailsByName } from "../server/iqair";

/**
 * Determines the color for AQI level based on the level string from IQAir
 */
function getAQILevelColor(level: string): Color {
  const levelLower = level.toLowerCase();
  if (levelLower.includes("good") || levelLower.includes("excellent")) {
    return Color.Green;
  } else if (levelLower.includes("moderate") || levelLower.includes("fair")) {
    return Color.Yellow;
  } else if (levelLower.includes("unhealthy for sensitive") || levelLower.includes("sensitive")) {
    return Color.Orange;
  } else if (levelLower.includes("unhealthy")) {
    return Color.Red;
  } else if (levelLower.includes("very unhealthy") || levelLower.includes("hazardous")) {
    return Color.Purple;
  } else {
    return Color.SecondaryText;
  }
}

function CityDetailsView({ city }: { city: string }) {
  const { isLoading, data, error, revalidate } = usePromise(
    async (cityName: string) => {
      const result = await fetchIQAirCityDetailsByName(cityName);
      if (!result) {
        throw new Error(`City "${cityName}" not found in IQAir ranking`);
      }
      return result;
    },
    [city],
    {
      execute: true,
    },
  );

  if (error) {
    const markdown = `# Error Loading IQAir

Failed to fetch data for **${city}**.

**Error:** ${error.message}`;

    return (
      <Detail
        isLoading={false}
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading || !data) {
    return <Detail isLoading={true} markdown={`# Loading air quality for **${city}**...`} />;
  }

  const levelColor = getAQILevelColor(data.level);
  const pollutantsTable =
    data.pollutants && data.pollutants.length > 0
      ? `| Pollutant | Value |\n|-----------|-------|\n${data.pollutants.map((p) => `| **${p.name}** | ${p.value} ${p.unit} |`).join("\n")}`
      : "No data available for individual pollutants.";

  // Format country with capital letter
  const country =
    data.countrySlug && data.countrySlug.length > 0
      ? data.countrySlug[0].toUpperCase() + data.countrySlug.slice(1)
      : data.countrySlug;

  const markdown = `# Air Quality: ${data.city}

## AQI: ${data.aqi}


---

## Air Pollutants

${pollutantsTable}
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="City" text={data.city} />
          <Detail.Metadata.Label title="Country" text={country} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Level">
            <Detail.Metadata.TagList.Item text={data.level} color={levelColor} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Main Pollutant"
            text={`${data.mainPollutant.name}: ${data.mainPollutant.value} ${data.mainPollutant.unit}`}
          />
          {data.pollutants && data.pollutants.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Pollutants" text={`${data.pollutants.length} measured`} />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action.OpenInBrowser
            title="View on IQAir"
            icon={Icon.Globe}
            url={data.url}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { isLoading, data, error, revalidate } = usePromise(async () => fetchIQAirTopCities(25), [], {
    execute: true,
  });

  if (error) {
    return (
      <List
        searchBarPlaceholder="Error loading IQAir data"
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} />
          </ActionPanel>
        }
      >
        <List.Item
          title="Error Loading IQAir Data"
          subtitle={error.message}
          accessories={[
            {
              text: "Try again or check your connection",
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={revalidate} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Top cities by IQAir">
      {data?.map((item) => {
        // Format country with capital letter
        const country =
          item.countrySlug && item.countrySlug.length > 0
            ? item.countrySlug[0].toUpperCase() + item.countrySlug.slice(1)
            : item.countrySlug;

        return (
          <List.Item
            key={`${item.city}-${item.rank}-${item.aqi}`}
            title={`${item.rank.toString().padStart(2, "0")}. ${item.city}`}
            subtitle={country}
            accessories={[
              { text: `AQI ${item.aqi.toString()}` },
              {
                icon: Icon.Globe,
                tooltip: item.url,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push title="View Details" icon={Icon.Info} target={<CityDetailsView city={item.city} />} />
                <Action.OpenInBrowser title="Open on IQAir" url={item.url} />
                <Action title="Refresh" onAction={revalidate} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
