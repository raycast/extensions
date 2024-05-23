import { Color as Colour, Detail, Icon, LaunchType, open } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";
import { badgeSizes, badgeStyles, dynamicBadgeTypes } from "../constants.js";
import { Badge } from "../types.js";
import { ellipsis, getTagColor, pickColor } from "../utils.js";

export type ParameterProps = {
  badge: Badge;
  onChange: (badge: Badge) => void;
  onInput: (input: { title: string; value?: string }) => void;
};

export const BaseInput = ({
  fieldName,
  badge,
  onInput,
}: ParameterProps & { fieldName: keyof Omit<Badge, "$icon"> }) => (
  <Detail.Metadata.TagList title={fieldName}>
    <Detail.Metadata.TagList.Item text={ellipsis(badge[fieldName])} color={Colour.Green} />
    <Detail.Metadata.TagList.Item
      icon={Icon.Pencil}
      text="edit"
      color={Colour.SecondaryText}
      onAction={() => onInput({ title: fieldName, value: badge[fieldName] })}
    />
  </Detail.Metadata.TagList>
);

export const BaseSelect = ({
  fieldName,
  options,
  defaultValue,
  badge,
  onChange,
}: ParameterProps & { fieldName: keyof Omit<Badge, "$icon">; options: string[]; defaultValue?: string }) => (
  <Detail.Metadata.TagList title="style">
    {options.map((x) => (
      <Detail.Metadata.TagList.Item
        key={x}
        text={ellipsis(x.replace(/$/g, ""))}
        color={getTagColor(x === (badge[fieldName] ?? defaultValue))}
        onAction={() => onChange({ ...badge, [fieldName]: x })}
      />
    ))}
  </Detail.Metadata.TagList>
);

export const Label = (props: ParameterProps) => <BaseInput fieldName="label" {...props} />;

export const Message = ({ badge, onChange, onInput }: ParameterProps) => {
  return (
    <Detail.Metadata.TagList title="message">
      <Detail.Metadata.TagList.Item
        text={"none"}
        color={getTagColor(!badge.message)}
        onAction={() => onChange({ ...badge, message: undefined })}
      />
      <Detail.Metadata.TagList.Item text={ellipsis(badge.message) || ""} color={getTagColor(Boolean(badge.message))} />
      <Detail.Metadata.TagList.Item
        icon={Icon.Pencil}
        text="edit"
        color={Colour.SecondaryText}
        onAction={() => onInput({ title: "message", value: badge.message })}
      />
    </Detail.Metadata.TagList>
  );
};

export const Color = ({ badge, onChange, onInput }: ParameterProps) => {
  return (
    <Detail.Metadata.TagList title="color">
      <Detail.Metadata.TagList.Item text={badge.color} color={badge.color} />
      {badge.$icon && badge.color !== badge.$icon.hex && (
        <Detail.Metadata.TagList.Item
          text={ellipsis(badge.$icon.hex)}
          color={getTagColor(badge.$icon.hex === badge.color, badge.$icon.hex)}
          onAction={() => {
            onChange({ ...badge, color: badge.$icon?.hex });
          }}
        />
      )}
      <Detail.Metadata.TagList.Item
        icon={Icon.EyeDropper}
        text="pick"
        color={Colour.SecondaryText}
        onAction={async () => {
          await pickColor({ field: "color" });
        }}
      />
      <Detail.Metadata.TagList.Item
        icon={Icon.Pencil}
        text="edit"
        color={Colour.SecondaryText}
        onAction={() => {
          onInput({ title: "color", value: badge.color });
        }}
      />
    </Detail.Metadata.TagList>
  );
};

export const LabelColor = ({ badge, onChange, onInput }: ParameterProps) => {
  return (
    <>
      {badge.label && (
        <Detail.Metadata.TagList title="labelColor">
          <Detail.Metadata.TagList.Item
            text="default"
            color={getTagColor(!badge.labelColor)}
            onAction={() => onChange({ ...badge, labelColor: undefined })}
          />
          {badge.$icon && badge.labelColor !== badge.$icon.hex && (
            <Detail.Metadata.TagList.Item
              text={ellipsis(badge.$icon.hex)}
              color={getTagColor(badge.$icon.hex === badge.labelColor, badge.$icon.hex)}
              onAction={() => {
                onChange({ ...badge, labelColor: badge.$icon?.hex });
              }}
            />
          )}
          <Detail.Metadata.TagList.Item text={badge.labelColor} color={badge.labelColor} />
          <Detail.Metadata.TagList.Item
            icon={Icon.EyeDropper}
            text="pick"
            color={Colour.SecondaryText}
            onAction={async () => {
              await pickColor({ field: "labelColor" });
            }}
          />
          <Detail.Metadata.TagList.Item
            icon={Icon.Pencil}
            text="edit"
            color={Colour.SecondaryText}
            onAction={() => onInput({ title: "labelColor", value: badge.labelColor })}
          />
        </Detail.Metadata.TagList>
      )}
    </>
  );
};

export const Logo = ({ badge, onChange, onInput }: ParameterProps) => {
  const { $icon, logoColor, logoSize } = badge;

  return (
    <>
      <Detail.Metadata.TagList title="logo">
        <Detail.Metadata.TagList.Item text={$icon?.slug ?? "none"} color={$icon?.hex ?? Colour.Green} />
        <Detail.Metadata.TagList.Item
          icon={Icon.Pencil}
          text="edit"
          color={Colour.SecondaryText}
          onAction={async () => {
            try {
              await crossLaunchCommand(
                {
                  name: "index",
                  type: LaunchType.UserInitiated,
                  extensionName: "simple-icons",
                  ownerOrAuthorName: "litomore",
                  context: {
                    launchFromExtensionTitle: "Badges - shields.io",
                  },
                },
                {
                  context: {
                    launchFromExtensionName: "simple-icons",
                  },
                },
              );
            } catch {
              open("raycast://extensions/litomore/simple-icons");
            }
          }}
        />
      </Detail.Metadata.TagList>
      {$icon && (
        <>
          <Detail.Metadata.TagList title="logoColor">
            <Detail.Metadata.TagList.Item
              text="default"
              color={getTagColor(!badge.logoColor)}
              onAction={() => onChange({ ...badge, logoColor: undefined })}
            />
            <Detail.Metadata.TagList.Item
              text={ellipsis($icon.hex)}
              color={getTagColor(badge.logoColor === $icon.hex, $icon.hex)}
              onAction={() => onChange({ ...badge, logoColor: $icon.hex })}
            />
            {badge.logoColor !== undefined && logoColor !== $icon.hex && (
              <Detail.Metadata.TagList.Item text={ellipsis(logoColor)} color={logoColor} />
            )}
            <Detail.Metadata.TagList.Item
              icon={Icon.EyeDropper}
              text="pick"
              color={Colour.SecondaryText}
              onAction={async () => {
                await pickColor({ field: "logoColor" });
              }}
            />
            <Detail.Metadata.TagList.Item
              icon={Icon.Pencil}
              text="edit"
              color={Colour.SecondaryText}
              onAction={() => onInput({ title: "logoColor", value: logoColor })}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="logoSize">
            {badgeSizes.map((badgeSize) => (
              <Detail.Metadata.TagList.Item
                key={badgeSize}
                text={ellipsis(badgeSize)}
                color={getTagColor(badgeSize === (logoSize ?? "default"))}
                onAction={() => onChange({ ...badge, logoSize: badgeSize === "default" ? undefined : badgeSize })}
              />
            ))}
          </Detail.Metadata.TagList>
        </>
      )}
    </>
  );
};

export const Style = (props: ParameterProps) => (
  <BaseSelect
    fieldName="style"
    defaultValue="flat"
    options={badgeStyles}
    {...props}
    onChange={(badge) => props.onChange({ ...badge, style: badge.style === "flat" ? undefined : badge.style })}
  />
);

export const Type = (props: ParameterProps) => (
  <BaseSelect fieldName="$type" defaultValue="json" options={dynamicBadgeTypes} {...props} />
);

export const Url = (props: ParameterProps) => <BaseInput fieldName="url" {...props} />;

export const Query = (props: ParameterProps) => <BaseInput fieldName="query" {...props} />;

export const Prefix = (props: ParameterProps) => <BaseInput fieldName="prefix" {...props} />;

export const Suffix = (props: ParameterProps) => <BaseInput fieldName="suffix" {...props} />;

export const fields = {
  Label,
  Message,
  Color,
  LabelColor,
  Logo,
  Style,
  Type,
  Url,
  Query,
  Prefix,
  Suffix,
};

export type FieldType = keyof typeof fields;
