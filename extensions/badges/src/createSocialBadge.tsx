import { useEffect } from "react";
import { Detail, LaunchProps } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import omitBy from "lodash/omitBy.js";
import { GeneralActions } from "./components/actions.js";
import { fields } from "./components/parameters.js";
import { colorsForBackground } from "./vendor/badge-maker-color.js";
import { Badge, LaunchFromSimpleIconsContext, LaunchFromColorPickerContext } from "./types.js";
import { codeBlock, encodeBadgeContentParameters, getCommandConfig } from "./utils.js";

const { defaultBadge, parameterIds } = getCommandConfig();

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchFromSimpleIconsContext & LaunchFromColorPickerContext }>) {
  const [badge, setBadge] = useCachedState<Badge>("social-badge", defaultBadge);

  useEffect(() => {
    if (launchContext?.launchFromExtensionName === "simple-icons" && launchContext?.icon) {
      setBadge({
        ...badge,
        $icon: launchContext.icon,
        label: launchContext.icon.title,
        message: undefined,
        color: launchContext.icon.hex,
        labelColor: undefined,
        logo: launchContext.icon.slug,
        logoColor: badge.style === "social" ? undefined : colorsForBackground("#" + launchContext.icon.hex),
      });
    }

    if (launchContext?.launchFromExtensionName === "color-picker" && launchContext?.hex && launchContext?.field) {
      setBadge({ ...badge, [launchContext.field]: launchContext.hex.slice(1) });
    }
  }, []);

  const badgeContent = encodeBadgeContentParameters(
    [badge.label ?? "", badge.message ?? "", badge.color ?? ""].filter(Boolean),
  ).join("-");

  const urlParameters = omitBy(badge, (v, k) => !v || k.startsWith("$") || ["label", "message", "color"].includes(k));
  const query = new URLSearchParams(urlParameters as Record<string, string>).toString();

  const badgeUrl = new URL(`https://img.shields.io/badge/${badgeContent}`);
  badgeUrl.search = query;

  const parameterFields = parameterIds.map((id) => fields[id]);
  const parameterProps = { badge, onChange: setBadge };

  const onStyleChange = (badge: Badge) => {
    const badgeMessage = badge.style === "social" ? (badge.message ?? "message") : badge.message;
    setBadge({
      ...badge,
      message: badgeMessage,
      logoColor: badge.style === "social" ? undefined : colorsForBackground("#" + badge.$icon?.hex),
    });
  };

  return (
    <Detail
      actions={
        <GeneralActions
          defaultBadge={defaultBadge}
          badgeUrl={badgeUrl}
          documentationUrl="https://shields.io/badges"
          onBadgeChange={setBadge}
        />
      }
      markdown={`${"# \n\n".repeat(5)}![](${badgeUrl})\n\n${codeBlock("markdown", badgeUrl.toString())}`}
      metadata={
        <Detail.Metadata>
          {parameterFields.map((P, index) => (
            <P
              key={`paramter-String(${index})`}
              {...parameterProps}
              onChange={P.name === "Style" ? onStyleChange : parameterProps.onChange}
            />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
