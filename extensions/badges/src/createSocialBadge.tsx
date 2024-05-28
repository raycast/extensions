import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Icon, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { omitBy } from "lodash";
import { Documentation } from "./components/actions.js";
import { Color, Label, LabelColor, Logo, Message, Style } from "./components/parameters.js";
import { Input } from "./components/input.js";
import { colorsForBackground } from "./vendor/badge-maker-color.js";
import { Badge, LaunchFromSimpleIconsContext, LaunchFromColorPickerContext } from "./types.js";
import { codeBlock, encodeBadgeContentParameters } from "./utils.js";

const defaultBadge: Badge = {
  $icon: { title: "Raycast", slug: "raycast", hex: "FF6363", source: "" },
  logo: "raycast",
  label: "Raycast",
  color: "FF6363",
  labelColor: undefined,
  logoColor: colorsForBackground("#FF6363"),
  style: "flat-square",
};
const validationFields = ["label", "color", "labelColor", "logoColor"];

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchFromSimpleIconsContext & LaunchFromColorPickerContext }>) {
  const [badge, setBadge] = useCachedState<Badge>("social-badge", defaultBadge);
  const [input, setInput] = useState<{ title: string; value?: string }>({ title: "", value: undefined });
  const [inputValid, setInputValid] = useState(true);

  const { resetOnCopy } = getPreferenceValues<Preferences>();

  const reset = () => {
    setBadge(defaultBadge);
  };

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

  if (input.title) {
    return (
      <Input
        input={input}
        inputValid={inputValid}
        onChange={(value) => {
          if (validationFields.includes(input.title)) {
            setInputValid(Boolean(value));
          }
        }}
        onSubmit={(values) => {
          setBadge({ ...badge, [input.title]: values[input.title] });
          setInput({ title: "", value: undefined });
        }}
      />
    );
  }

  const badgeUrl = new URL(`https://img.shields.io/badge/${badgeContent}`);
  badgeUrl.search = query;

  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy URL to Clipboard"
              content={badgeUrl.toString()}
              onCopy={() => {
                if (resetOnCopy) reset();
              }}
            />
            <Action
              icon={Icon.Undo}
              title="Reset"
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={() => reset()}
            />
          </ActionPanel.Section>
          <Documentation title="API Documentation" url="https://shields.io/badges" />
        </ActionPanel>
      }
      markdown={`${"# \n\n".repeat(5)}![](${badgeUrl})\n\n${codeBlock("markdown", badgeUrl.toString())}`}
      metadata={
        <Detail.Metadata>
          <Logo badge={badge} onChange={setBadge} onInput={setInput} />
          <Style
            badge={badge}
            onChange={(badge) => {
              const badgeMessage = badge.style === "social" ? badge.message ?? "message" : badge.message;
              setBadge({
                ...badge,
                message: badgeMessage,
                logoColor: badge.style === "social" ? undefined : colorsForBackground("#" + badge.$icon?.hex),
              });
            }}
            onInput={() => {}}
          />
          <Label badge={badge} onChange={setBadge} onInput={setInput} />
          <Message badge={badge} onChange={setBadge} onInput={setInput} />
          <Color badge={badge} onChange={setBadge} onInput={setInput} />
          <LabelColor badge={badge} onChange={setBadge} onInput={setInput} />
        </Detail.Metadata>
      }
    />
  );
}
