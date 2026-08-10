import { Form, Icon, Color } from "@raycast/api";
import { BackgroundType } from "../type";
import { GRADIENT_PRESETS, SOLID_COLORS, DEFAULT_FOLDER_COLOR } from "../utils/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ItemProps = any;

interface BackgroundOptionsProps {
  backgroundTypeProps: ItemProps;
  solidColorProps: ItemProps;
  gradientPresetProps: ItemProps;
  customColorProps: ItemProps;
  backgroundImageProps: ItemProps;
  currentBackgroundType: BackgroundType;
  hideImageOption?: boolean;
  hideGradientOption?: boolean;
  showDefaultColor?: boolean;
}

export function BackgroundOptions({
  backgroundTypeProps,
  solidColorProps,
  gradientPresetProps,
  customColorProps,
  backgroundImageProps,
  currentBackgroundType,
  hideImageOption = false,
  hideGradientOption = false,
  showDefaultColor = false,
}: BackgroundOptionsProps) {
  return (
    <>
      <Form.Dropdown title="Background Type" {...backgroundTypeProps}>
        <Form.Dropdown.Item
          value="solid"
          title="Solid Color"
          icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
        />
        {!hideGradientOption && (
          <Form.Dropdown.Item
            value="gradient"
            title="Gradient"
            icon={{ source: Icon.CircleFilled, tintColor: Color.Purple }}
          />
        )}
        <Form.Dropdown.Item
          value="custom"
          title="Custom Color"
          icon={{ source: Icon.Hashtag, tintColor: Color.Orange }}
        />
        {!hideImageOption && (
          <Form.Dropdown.Item value="image" title="Image" icon={{ source: Icon.Image, tintColor: Color.Green }} />
        )}
      </Form.Dropdown>

      {currentBackgroundType === "solid" && (
        <Form.Dropdown title="Color" {...solidColorProps}>
          {showDefaultColor && (
            <Form.Dropdown.Item
              key={DEFAULT_FOLDER_COLOR}
              title="Default"
              value={DEFAULT_FOLDER_COLOR}
              icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            />
          )}
          {SOLID_COLORS.map((color) => (
            <Form.Dropdown.Item
              key={color.value}
              title={color.title}
              value={color.value}
              icon={{ source: Icon.CircleFilled, tintColor: color.value }}
            />
          ))}
        </Form.Dropdown>
      )}

      {currentBackgroundType === "gradient" && (
        <Form.Dropdown title="Gradient" {...gradientPresetProps}>
          {GRADIENT_PRESETS.map((gradient) => (
            <Form.Dropdown.Item
              key={gradient.value}
              title={gradient.title}
              value={gradient.value}
              icon={{ source: Icon.CircleFilled, tintColor: gradient.colors[0] }}
            />
          ))}
        </Form.Dropdown>
      )}

      {currentBackgroundType === "custom" && (
        <Form.TextField
          title="Color"
          placeholder="#FF5733 or rgb(255,87,51)"
          info="HEX (#FF5733), RGB (rgb(255,87,51)), or RGBA (rgba(255,87,51,0.5))"
          {...customColorProps}
        />
      )}

      {currentBackgroundType === "image" && !hideImageOption && (
        <Form.FilePicker
          title="Background Image"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          info="Select an image to use as background"
          {...backgroundImageProps}
        />
      )}
    </>
  );
}
