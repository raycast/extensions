import { showToast, Toast, LaunchProps, Detail, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

// Define the Command interface for type safety
type CommandArguments = {
  restaurantName: string;
};

interface Restaurant {
  camis: string;
  dba: string;
  boro: string;
  building: string;
  street: string;
  zipcode: string;
  phone: string;
  cuisine_description: string;
  inspection_date: string;
  action: string;
  violation_code: string;
  violation_description: string;
  critical_flag: string;
  score: string;
  grade: string;
  grade_date: string;
  record_date: string;
  inspection_type: string;
}

interface SearchResult {
  data: Restaurant[];
  markdown: string;
  summary: string;
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { restaurantName } = props.arguments;
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Construct the SoQL query (SQL for OpenData)
  const baseUrl = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
  const whereClause = restaurantName
    ? `upper(dba) LIKE upper('%25${restaurantName.trim().replace(/'/g, "''")}%25')`
    : "";
  const apiUrl = `${baseUrl}?$where=${whereClause}&$order=inspection_date DESC&$limit=5`;

  const { isLoading, data, error } = useFetch<Restaurant[]>(apiUrl, {
    execute: !!restaurantName,
    onData: async (data) => {
      if (data && data.length > 0) {
        const markdown = await generateDetailView(data);
        const summary = await generateSummary(data);
        setSearchResult({ data, markdown, summary });
      }
    },
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `${error}`,
      });
    },
    keepPreviousData: false,
  });

  if (isLoading) {
    return <Detail markdown="Loading..." />;
  }

  if (error || !data || data.length === 0 || !searchResult) {
    return <Detail markdown={`Error: ${error || "No results found for " + restaurantName}`} />;
  }

  return (
    <Detail
      markdown={searchResult.markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Restaurant" text={searchResult.data[0].dba} icon={Icon.Store} />
          <Detail.Metadata.Label title="Cuisine" text={searchResult.data[0].cuisine_description} icon={Icon.Text} />
          <Detail.Metadata.Label
            title="Grade"
            text={searchResult.data[0].grade || "Not Graded"}
            icon={getGradeIcon(searchResult.data[0].grade)}
          />
          <Detail.Metadata.Label
            title="Last Inspection"
            text={formatDate(new Date(searchResult.data[0].inspection_date))}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label title="Phone" text={formatPhoneNumber(searchResult.data[0].phone)} icon={Icon.Phone} />
          <Detail.Metadata.TagList title="Location">
            <Detail.Metadata.TagList.Item
              text={`${searchResult.data[0].building} ${searchResult.data[0].street}`}
              icon={Icon.Circle}
              color={Color.Blue}
            />
            <Detail.Metadata.TagList.Item
              text={`${searchResult.data[0].boro}, NY ${searchResult.data[0].zipcode}`}
              icon={Icon.Circle}
              color={Color.Blue}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" content={searchResult.summary} />
          <Action.OpenInBrowser
            title="View on Nyc Opendata"
            url={`https://data.cityofnewyork.us/Health/DOHMH-New-York-City-Restaurant-Inspection-Results/43nn-pn8j/data?q=${encodeURIComponent(searchResult.data[0].dba)}`}
          />
          <Action.OpenInBrowser
            title="Open in Google Maps"
            icon={Icon.Map}
            url={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${searchResult.data[0].dba} ${searchResult.data[0].building} ${searchResult.data[0].street} ${searchResult.data[0].boro} NY ${searchResult.data[0].zipcode}`,
            )}`}
          />
        </ActionPanel>
      }
    />
  );
}

async function generateDetailView(restaurantData: Restaurant[]): Promise<string> {
  try {
    const mostRecent = restaurantData[0];
    const inspectionDate = formatDate(new Date(mostRecent.inspection_date));

    let gradeEmoji = "❓";
    switch (mostRecent.grade) {
      case "A":
        gradeEmoji = "🟢";
        break;
      case "B":
        gradeEmoji = "🟡";
        break;
      case "C":
        gradeEmoji = "🔴";
        break;
    }

    const markdown = `# ${mostRecent.dba}

## Latest Inspection Details
${gradeEmoji} **Current Grade:** ${mostRecent.grade || "Not Graded"}
📅 **Inspection Date:** ${inspectionDate}
${mostRecent.score ? `📊 **Score:** ${mostRecent.score}` : ""}

## Violations
${
  mostRecent.violation_description
    ? `⚠️ **Latest Violation:**\n${mostRecent.violation_description}\n\n**Critical:** ${mostRecent.critical_flag === "Y" ? "Yes" : "No"}`
    : "✅ No violations found in latest inspection"
}

## Additional Information
- **Type:** ${mostRecent.inspection_type || "Not specified"}
- **Action:** ${mostRecent.action || "None"}
- **CAMIS ID:** ${mostRecent.camis}

---
*Data provided by NYC Department of Health and Mental Hygiene*`;

    return markdown;
  } catch (error) {
    return `Error generating detail view: ${error}`;
  }
}

async function generateSummary(restaurantData: Restaurant[]): Promise<string> {
  const mostRecent = restaurantData[0];
  const inspectionDate = formatDate(new Date(mostRecent.inspection_date));

  return `🏪 ${mostRecent.dba} (${mostRecent.cuisine_description})
📍 ${mostRecent.building} ${mostRecent.street}, ${mostRecent.boro}, NY ${mostRecent.zipcode}
📋 Current Grade: ${mostRecent.grade || "Not Graded"} (Last inspected: ${inspectionDate})
⚠️ ${mostRecent.violation_description || "No recent violations found."}`;
}

function getGradeIcon(grade: string | undefined): Icon {
  switch (grade) {
    case "A":
      return Icon.Circle;
    case "B":
      return Icon.CircleProgress75;
    case "C":
      return Icon.CircleProgress25;
    default:
      return Icon.QuestionMark;
  }
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "N/A";
  return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}
