import { useState, useEffect } from 'react';
import { getPreferenceValues, Detail, Grid, LaunchProps, ActionPanel, Action } from "@raycast/api";
import { IconItem } from "./utils/types";
import { getUsageColor, normalizeHexCode } from './utils/helpers';
import { nounProjectData } from "./utils/nounData";
import CopyIconAction from './copyIcon';

const publicDomain = getPreferenceValues<Preferences>().publicDomain;
const showUsage = getPreferenceValues<Preferences>().showUsage;
interface IconSearchData {
  isLoading: boolean;
  status: string;
  data: {
    error: Error | null;
    generated_at: string;
    icons: IconItem[];
    usage_limits: {
      monthly: {
        limit: number;
        usage: number;
      };
    }
  };
}

export default function Command(props: LaunchProps) {
  const { keyword, customColor } = props.arguments;
  let { color } = props.arguments;
  const [iconResponse, setIconResponse] = useState<JSX.Element>(<Detail isLoading={true} markdown="Loading..." />);

  if (customColor) {
    const normalizedColor = normalizeHexCode(customColor);
    if (normalizedColor !== false) {
      // Override the default color with the normalized color if it is defined and valid
      color = normalizedColor; // Use the normalized color instead of customColor
    } else {
      return (
        <Detail isLoading={false} markdown={`# Error: ${customColor} is not a valid hex code`} />
      );
    }
  }
  
  useEffect(() => {
    nounProjectData(`icon?query=${keyword}&limit_to_public_domain=${publicDomain}`)
    .then((response) => {
      const data = (response as IconSearchData).data;

      if (data.error) {
        setIconResponse(
          <Detail isLoading={false} markdown={`# Error: ${JSON.stringify(data.error)}`} />
        );
        return;
      }
      
      setIconResponse(
        <Grid 
          searchBarPlaceholder={`Search ${data.icons.length} icons...`}
          columns={6}
          isLoading={false}
          inset={Grid.Inset.Small}>
          {data.icons && data.icons.length === 0 && (
            <Grid.EmptyView 
              icon='no-results.png' 
              title={`No icons found. Please try again.`}
              description={showUsage && (`${data.usage_limits.monthly.usage} used of ${data.usage_limits.monthly.limit} total tokens. 
              ${data.usage_limits.monthly.limit - data.usage_limits.monthly.usage} tokens remaining.`)} 
            />
          )}
          {data.icons.map((icon: IconItem) => (
            <Grid.Item
              key={icon.id}
              content={icon.thumbnail_url}
              title={icon.term}
              subtitle={`- ${icon.creator.name}`}
              actions={
                <ActionPanel title="Noun Project Actions">
                  <CopyIconAction color={ color } iconName={ icon.term } iconId={ icon.id } />
                  <Action.OpenInBrowser title="Open in Browser" url={`https://thenounproject.com${icon.permalink}`} />
                  {icon?.collections[0]?.permalink && (
                    <Action.OpenInBrowser title="View Collection in Browser" url={`https://thenounproject.com${icon.collections[0].permalink}`} />
                  )}
                </ActionPanel>
              }
            />
          ))}
          {showUsage && data.icons.length !== 0 && (
            <Grid.Item 
              key='apiUsageReport' 
              title={`${data.usage_limits.monthly.usage}/${data.usage_limits.monthly.limit} used`} 
              content={{color: getUsageColor(data.usage_limits.monthly.usage, data.usage_limits.monthly.limit)}}
            />
          )}
        </Grid>
      );
    }).catch((error) => {
      console.error("Error retrieving data:", error);
      setIconResponse(
        <Detail isLoading={false} markdown={`# Error: ${JSON.stringify(error)}`} />
      );
    });

  }, [keyword]);

  return iconResponse;
}
