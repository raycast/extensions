import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  LaunchProps,
  LaunchType,
  getPreferenceValues,
  launchCommand,
  open,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { omitBy } from "lodash";
import { IconData, LaunchFromSimpleIconsContext } from "./types.js";

const badgeStyles = ["flat", "flat-square", "plastic", "for-the-badge", "social"];
const badgeSizes = ["default", "auto"];

const codeBlock = (type: string, text: string) => "```" + type + "\n" + text + "\n```";
const encodeBadgeContentParameters = (params: string[]) => params.map((p) => encodeURIComponent(p.replace(/-/g, "--")));
const getTagColor = (active: boolean, activeColor?: Color.ColorLike) =>
  active ? activeColor ?? Color.Green : Color.SecondaryText;

export default function Command({ launchContext }: LaunchProps<{ launchContext?: LaunchFromSimpleIconsContext }>) {
  const [selectedLabel, setSelectedLabel] = useCachedState("label", "label");
  const [selectedMessage, setSelectedMessage] = useCachedState<string | undefined>("message", "message");
  const [selectedColor, setSelectedColor] = useCachedState("color", "blue");
  const [selectedLabelColor, setSelectedLabelColor] = useCachedState<string>("labelColor");
  const [selectedLogo, setSelectedLogo] = useCachedState<IconData>("logo");
  const [selectedLogoColor, setSelectedLogoColor] = useCachedState<string>("logoColor");
  const [selectedLogoSize, setSelectedLogoSize] = useCachedState<string>("logoSize");
  const [selectedStyle, setSelectedStyle] = useCachedState<string>("style");

  const [inputTitle, setInputTitle] = useState<string>("");
  const [inputDefaultValue, setInputDefaultValue] = useState<string>();
  const [inputValid, setInputValid] = useState(true);

  const { resetOnCopy } = getPreferenceValues<Preferences>();

  const reset = () => {
    setSelectedLabel("label");
    setSelectedMessage("message");
    setSelectedColor("blue");
    setSelectedLabelColor(undefined);
    setSelectedLogo(undefined);
    setSelectedLogoColor(undefined);
    setSelectedLogoSize(undefined);
    setSelectedStyle(undefined);
  };

  const validateInput = (value: string) => {
    if (["label", "color", "labelColor", "logoColor"].includes(inputTitle)) {
      setInputValid(Boolean(value));
    }
  };

  useEffect(() => {
    if (launchContext?.launchFromExtensionName === "simple-icons" && launchContext?.icon) {
      setSelectedLogo(launchContext.icon);
      setSelectedLogoColor(undefined);
    }
  }, []);

  useEffect(() => {
    if (inputTitle) {
      validateInput(inputDefaultValue ?? "");
    }
  }, [inputTitle, inputDefaultValue]);

  const badgeContent = encodeBadgeContentParameters(
    [selectedLabel, selectedMessage ?? "", selectedColor].filter(Boolean),
  ).join("-");

  const urlParameters = omitBy(
    {
      labelColor: selectedLabelColor,
      logo: selectedLogo?.slug,
      logoColor: selectedLogoColor,
      logoSize: selectedLogoSize,
      style: selectedStyle,
    },
    (x) => !x,
  );

  const query = new URLSearchParams(urlParameters as Record<string, string>).toString();

  if (inputTitle) {
    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title={`Submit ${inputTitle}`}
              onSubmit={(values) => {
                if (inputTitle === "label") setSelectedLabel(values[inputTitle]);
                if (inputTitle === "message") setSelectedMessage(values[inputTitle]);
                if (inputTitle === "color") setSelectedColor(values[inputTitle]);
                if (inputTitle === "labelColor") setSelectedLabelColor(values[inputTitle]);
                if (inputTitle === "logoColor") setSelectedLogoColor(values[inputTitle]);
                setInputTitle("");
                setInputDefaultValue(undefined);
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id={inputTitle}
          title={inputTitle}
          defaultValue={inputDefaultValue}
          placeholder={`Enter your ${inputTitle}`}
          error={inputValid ? undefined : "This field is required"}
          onChange={(value) => {
            if (["label", "color", "labelColor", "logoColor"].includes(inputTitle)) {
              setInputValid(Boolean(value));
            }
          }}
        />
      </Form>
    );
  }

  const badgeUrl = new URL(`https://shields.io/badge/${badgeContent}`);
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
        </ActionPanel>
      }
      markdown={`${"# \n\n".repeat(5)}![](${badgeUrl})\n\n${codeBlock("markdown", badgeUrl.toString())}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="label">
            <Detail.Metadata.TagList.Item text={selectedLabel} color={Color.Green} />
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="edit"
              color={Color.SecondaryText}
              onAction={() => {
                setInputTitle("label");
                setInputDefaultValue(selectedLabel);
              }}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="message">
            <Detail.Metadata.TagList.Item
              text={"none"}
              color={getTagColor(!selectedMessage)}
              onAction={() => setSelectedMessage(undefined)}
            />
            <Detail.Metadata.TagList.Item text={selectedMessage || ""} color={getTagColor(Boolean(selectedMessage))} />
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="edit"
              color={Color.SecondaryText}
              onAction={() => {
                setInputTitle("message");
                setInputDefaultValue(selectedMessage);
              }}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="color">
            <Detail.Metadata.TagList.Item text={selectedColor} color={selectedColor} />
            {selectedLogo && selectedColor !== selectedLogo.hex && (
              <Detail.Metadata.TagList.Item
                text={selectedLogo.hex}
                color={getTagColor(selectedLogo.hex === selectedColor, selectedLogo.hex)}
                onAction={() => {
                  setSelectedColor(selectedLogo.hex);
                }}
              />
            )}
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="edit"
              color={Color.SecondaryText}
              onAction={() => {
                setInputTitle("color");
                setInputDefaultValue(selectedColor);
              }}
            />
          </Detail.Metadata.TagList>
          {selectedLabel && (
            <Detail.Metadata.TagList title="labelColor">
              <Detail.Metadata.TagList.Item
                text="default"
                color={getTagColor(!selectedLabelColor)}
                onAction={() => setSelectedLabelColor(undefined)}
              />
              <Detail.Metadata.TagList.Item text={selectedLabelColor} color={selectedLabelColor} />
              <Detail.Metadata.TagList.Item
                icon={Icon.Pencil}
                text="edit"
                color={Color.SecondaryText}
                onAction={() => {
                  setInputTitle("labelColor");
                  setInputDefaultValue(selectedLabelColor);
                }}
              />
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.TagList title="logo">
            <Detail.Metadata.TagList.Item
              text={selectedLogo?.slug ?? "none"}
              color={selectedLogo?.hex ?? Color.Green}
            />
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="edit"
              color={Color.SecondaryText}
              onAction={async () => {
                try {
                  await launchCommand({
                    name: "index",
                    type: LaunchType.UserInitiated,
                    extensionName: "simple-icons",
                    ownerOrAuthorName: "litomore",
                    context: {
                      launchFromExtensionTitle: "Badges - shields.io",
                      callbackLaunchOptions: {
                        name: "createStaticBadge",
                        type: LaunchType.UserInitiated,
                        extensionName: "badges",
                        ownerOrAuthorName: "litomore",
                      },
                    },
                  });
                } catch {
                  open("raycast://extensions/litomore/simple-icons");
                }
              }}
            />
          </Detail.Metadata.TagList>
          {selectedLogo && (
            <>
              <Detail.Metadata.TagList title="logoColor">
                <Detail.Metadata.TagList.Item
                  text="default"
                  color={getTagColor(!selectedLogoColor)}
                  onAction={() => setSelectedLogoColor(undefined)}
                />
                <Detail.Metadata.TagList.Item
                  text={selectedLogo.hex}
                  color={getTagColor(selectedLogoColor === selectedLogo.hex, selectedLogo.hex)}
                  onAction={() => setSelectedLogoColor(selectedLogo.hex)}
                />
                {selectedLogoColor !== undefined && selectedLogoColor !== selectedLogo.hex && (
                  <Detail.Metadata.TagList.Item text={selectedLogoColor} color={selectedLogoColor} />
                )}
                <Detail.Metadata.TagList.Item
                  icon={Icon.Pencil}
                  text="edit"
                  color={Color.SecondaryText}
                  onAction={() => {
                    setInputTitle("logoColor");
                    setInputDefaultValue(selectedLogoColor);
                  }}
                />
              </Detail.Metadata.TagList>
              <Detail.Metadata.TagList title="logoSize">
                {badgeSizes.map((logoSize) => (
                  <Detail.Metadata.TagList.Item
                    key={logoSize}
                    text={logoSize}
                    color={getTagColor(logoSize === (selectedLogoSize ?? "default"))}
                    onAction={() => setSelectedLogoSize(logoSize === "default" ? undefined : logoSize)}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}
          <Detail.Metadata.TagList title="style">
            {badgeStyles.map((style) => (
              <Detail.Metadata.TagList.Item
                key={style}
                text={style}
                color={getTagColor(style === (selectedStyle ?? "flat"))}
                onAction={() => setSelectedStyle(style === "flat" ? undefined : style)}
              />
            ))}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
    />
  );
}
