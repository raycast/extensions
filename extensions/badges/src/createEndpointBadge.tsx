import { useEffect } from "react";
import { Detail, LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import omitBy from "lodash/omitBy.js";
import { GeneralActions } from "./components/actions.js";
import { fields } from "./components/parameters.js";
import { Badge, LaunchFromSimpleIconsContext, LaunchFromColorPickerContext } from "./types.js";
import { codeBlock, getCommandConfig } from "./utils.js";

const { defaultBadge, parameterIds } = getCommandConfig();

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchFromSimpleIconsContext & LaunchFromColorPickerContext }>) {
  const [badge, setBadge] = useCachedState<Badge>("endpoint-badge", defaultBadge);

  useEffect(() => {
    if (launchContext?.launchFromExtensionName === "simple-icons" && launchContext?.icon) {
      setBadge({ ...badge, $icon: launchContext.icon, logo: launchContext.icon.slug, logoColor: undefined });
    }

    if (launchContext?.launchFromExtensionName === "color-picker" && launchContext?.hex && launchContext?.field) {
      setBadge({ ...badge, [launchContext.field]: launchContext.hex.slice(1) });
    }
  }, []);

  const urlParameters = omitBy(badge, (v, k) => !v || k.startsWith("$"));
  const query = new URLSearchParams(urlParameters as Record<string, string>).toString();

  const badgeUrl = new URL(`https://img.shields.io/badge/endpoint`);
  badgeUrl.search = query;

  const parameterFields = parameterIds.map((id) => fields[id]);
  const parameterProps = { badge, onChange: setBadge };

  return (
    <Detail
      actions={
        <GeneralActions
          defaultBadge={defaultBadge}
          badgeUrl={badgeUrl}
          documentationUrl="https://shields.io/badges/endpoint-badge"
          onBadgeChange={setBadge}
        />
      }
      markdown={`${"# \n\n".repeat(5)}![](${badgeUrl})\n\n${codeBlock("markdown", badgeUrl.toString())}`}
      metadata={
        <Detail.Metadata>
          {parameterFields.map((P, index) => (
            <P key={`paramter-String(${index})`} {...parameterProps} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
