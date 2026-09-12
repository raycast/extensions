import { useState, useEffect } from "react";
import { getPreferenceValues, Detail, Icon, Grid, LaunchProps, ActionPanel, Action, Color } from "@raycast/api";
import { IconItem, IconSearchData } from "./utils/types";
import { getUsageColor, normalizeHexCode } from "./utils/helpers";
import { nounProjectData } from "./utils/nounData";
import CopyIconAction from "./copyIcon";
import CopyImageIcon from "./copyImgIcon";
import CopyReactComponent from "./copyReactComponent";
import CopyVueComponent from "./copyVueComponent";
import CopySVG from "./copySvg";

const publicDomain = getPreferenceValues<Preferences>().publicDomain;
const showUsage = getPreferenceValues<Preferences>().showUsage;

import { NounProjectError } from "./utils/types";

export default function Command(props: LaunchProps) {
  const { keyword, customColor } = props.arguments;
  let { color } = props.arguments;
  if (!color) color = "000000";

  const [iconResponse, setIconResponse] = useState<JSX.Element>(<Detail isLoading={true} markdown="Loading..." />);

  const showDetailError = (error: NounProjectError) => {
    if (!error) {
      return;
    }

    const baseMessage = `# Error ${error.statusCode} \n There was an error with your request. Please check your API keys in the extension settings and try again.`;
    const unauthorizedMessage = `# Error: Unauthorized \n Your API credentials are not valid. Please try again. Get your keys at [the Noun Project developer console](https://thenounproject.com/developers/apps/).`;

    const message = error.statusCode === 401 || error.statusCode === 403 ? unauthorizedMessage : baseMessage;

    setIconResponse(<Detail isLoading={false} markdown={message} />);
  };

  if (customColor.length) {
    const normalizedColor = normalizeHexCode(customColor);
    if (normalizedColor !== false) {
      // Override the default color with the normalized color if it is defined and valid
      color = normalizedColor;
    } else {
      return (
        <Detail
          isLoading={false}
          markdown={`# Error: ${customColor} is not a valid hex code. 
        \n Please provide a valid hexadecimal code like #FFFFFF`}
        />
      );
    }
  }

  useEffect(() => {
    nounProjectData(`icon?query=${keyword}&limit_to_public_domain=${publicDomain}`)
      .then((response) => {
        const data = (response as IconSearchData).data;

        showDetailError(data.error);

        setIconResponse(
          <Grid
            searchBarPlaceholder={`Search ${data.icons.length} icons...`}
            columns={6}
            isLoading={false}
            inset={Grid.Inset.Small}
          >
            {data.icons && data.icons.length === 0 && (
              <Grid.EmptyView
                icon="no-results.png"
                title={`No icons found. Please try again.`}
                description={
                  showUsage &&
                  `${data.usage_limits.monthly.usage} used of ${data.usage_limits.monthly.limit} total tokens. 
              ${data.usage_limits.monthly.limit - data.usage_limits.monthly.usage} tokens remaining.`
                }
              />
            )}
            <Grid.Item
              content={`https://www.thecolorapi.com/id?format=svg&hex=${color}&named=false`}
              title={`#${color}`}
              subtitle={"Selected Color"}
            />
            {data.icons.map((icon: IconItem) => (
              <Grid.Item
                key={icon.id}
                content={{ source: icon.thumbnail_url, tintColor: Color.PrimaryText }}
                title={icon.term}
                keywords={icon.creator.name.split(" ")}
                subtitle={`- ${icon.creator.name}`}
                actions={
                  <ActionPanel title="Noun Project Actions">
                    <CopyIconAction color={color} iconName={icon.term} iconId={icon.id} />
                    <CopyImageIcon color={color} iconName={icon.term} iconId={icon.id} />
                    <CopySVG color={color} iconName={icon.term} iconId={icon.id} />

                    <CopyReactComponent iconId={icon.id} iconName={icon.term} color={color} />
                    <CopyVueComponent iconId={icon.id} iconName={icon.term} color={color} />

                    <Action.OpenInBrowser
                      title={`View ${icon.term} on Noun Project`}
                      url={`https://thenounproject.com${icon.permalink}`}
                    />
                    {icon?.collections[0]?.permalink && (
                      <Action.OpenInBrowser
                        icon={Icon.AppWindowGrid3x3}
                        title={`View ${icon.collections[0].name} Collection by ${icon.creator.name} in Browser`}
                        url={`https://thenounproject.com${icon.collections[0].permalink}`}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
            {showUsage && data.icons.length !== 0 && (
              <Grid.Item
                key="apiUsageReport"
                title={`${data.usage_limits.monthly.usage}/${data.usage_limits.monthly.limit}`}
                content={{ color: getUsageColor(data.usage_limits.monthly.usage, data.usage_limits.monthly.limit) }}
                subtitle={`API Usage`}
              />
            )}
          </Grid>,
        );
      })
      .catch((error) => {
        console.error("Error retrieving data:", error);
        showDetailError(error);
      });
  }, [keyword]);

  return iconResponse;
}
