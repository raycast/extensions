import { useEffect, useState } from "react";
import { Action, ActionPanel, Detail, Form, Icon, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { omitBy } from "lodash";
import { Documentation } from "./components/actions.js";
import { FieldType, fields } from "./components/parameters.js";
import { Badge, LaunchFromSimpleIconsContext, LaunchFromColorPickerContext } from "./types.js";
import { codeBlock, encodeBadgeContentParameters } from "./utils.js";

const defaultBadge: Badge = {
  label: "label",
  message: "message",
  color: "blue",
};

const parameterIds: FieldType[] = ["Label", "Message", "Color", "LabelColor", "Logo", "Style"];

export default function Command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchFromSimpleIconsContext & LaunchFromColorPickerContext }>) {
  const [badge, setBadge] = useCachedState<Badge>("static-badge", defaultBadge);
  const [input, setInput] = useState<{ title: string; value?: string }>({ title: "", value: undefined });
  const [inputValid, setInputValid] = useState(true);

  const { resetOnCopy } = getPreferenceValues<Preferences>();

  const reset = () => {
    setBadge(defaultBadge);
  };

  const validateInput = (value: string) => {
    if (["label", "color", "labelColor", "logoColor"].includes(input.title)) {
      setInputValid(Boolean(value));
    }
  };

  useEffect(() => {
    if (launchContext?.launchFromExtensionName === "simple-icons" && launchContext?.icon) {
      setBadge({ ...badge, $icon: launchContext.icon, logo: launchContext.icon.slug, logoColor: undefined });
    }

    if (launchContext?.launchFromExtensionName === "color-picker" && launchContext?.hex && launchContext?.field) {
      setBadge({ ...badge, [launchContext.field]: launchContext.hex.slice(1) });
    }
  }, []);

  useEffect(() => {
    if (input.title) {
      validateInput(input.value ?? "");
    }
  }, [input]);

  const badgeContent = encodeBadgeContentParameters(
    [badge.label ?? "", badge.message ?? "", badge.color ?? ""].filter(Boolean),
  ).join("-");

  const urlParameters = omitBy(badge, (v, k) => !v || k.startsWith("$") || ["label", "message", "color"].includes(k));
  const query = new URLSearchParams(urlParameters as Record<string, string>).toString();

  if (input.title) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={`Submit ${input.title}`}
              onSubmit={(values) => {
                setBadge({ ...badge, [input.title]: values[input.title] });
                setInput({ title: "", value: undefined });
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id={input.title}
          title={input.title}
          defaultValue={input.value}
          placeholder={`Enter your ${input.title}`}
          error={inputValid ? undefined : "This field is required"}
          onChange={(value) => {
            if (["label", "color", "labelColor", "logoColor"].includes(input.title)) {
              setInputValid(Boolean(value));
            }
          }}
        />
      </Form>
    );
  }

  const badgeUrl = new URL(`https://img.shields.io/badge/${badgeContent}`);
  badgeUrl.search = query;

  const parameterFields = parameterIds.map((id) => fields[id]);
  const parameterProps = { badge, onChange: setBadge, onInput: setInput };

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
          {parameterFields.map((P, index) => (
            <P key={`paramter-String(${index})`} {...parameterProps} />
          ))}
        </Detail.Metadata>
      }
    />
  );
}
