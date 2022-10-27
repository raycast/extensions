import { Form, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { ConfigureProps, Format } from "../types/types";
import { color as d3color } from "d3-color";
import { homedir } from "os";
import fs from "fs";

export const ConfigureAction = (props: ConfigureProps): JSX.Element => {
  return (
    <Action.Push
      title="Configure Icon"
      icon={Icon.Cog}
      target={<ConfigureIcon {...props} />}
      shortcut={{ modifiers: ["cmd"], key: "e" }}
    />
  );
};

const ConfigureIcon = (props: ConfigureProps): JSX.Element => {
  return (
    <Form navigationTitle="Configure Icon">
      <DownloadName {...props} />
      <DownloadPath {...props} />
      <ImageSize {...props} />
      <ImageFormat {...props} />
      <IconColor {...props} />
      <BackgroundColor {...props} />
      <SVGPadding {...props} />
    </Form>
  );
};

const DownloadName = (props: ConfigureProps): JSX.Element => {
  return (
    <Form.TextField
      id="downloadName"
      title="Download Name"
      placeholder={props.icon.name}
      onChange={(value: string) => {
        props.icon.downloadName = value;
      }}
    />
  );
};

const DownloadPath = (props: ConfigureProps): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <Form.TextField
      id="downloadPath"
      title="Download Path"
      defaultValue={props.options.path}
      error={error}
      onChange={(value: string) => {
        if (value) {
          value = value.replace("~", homedir());
          if (fs.existsSync(value)) {
            setError(undefined);
            props.setOptions({ ...props.options, path: value });
          } else {
            setError("Path Does Not Exist");
          }
        } else {
          setError("Path Cannot Be Empty");
        }
      }}
    />
  );
};

const ImageFormat = (props: ConfigureProps): JSX.Element => {
  const formats = ["png", "jpg", "webp"];
  return (
    <Form.Dropdown
      id="imageFormat"
      title="Image Format"
      defaultValue={props.options.format}
      onChange={(value: string) => {
        props.setOptions({ ...props.options, format: value as Format });
      }}
    >
      {formats.map((format: string, index: number) => (
        <Form.Dropdown.Item key={index} value={format} title={format.toUpperCase()} />
      ))}
    </Form.Dropdown>
  );
};

const ImageSize = (props: ConfigureProps): JSX.Element => {
  const sizes = ["32", "64", "128", "256", "512"];
  return (
    <Form.Dropdown
      id="imageSize"
      title="Image Size"
      defaultValue={props.options.size.toString()}
      onChange={(value: string) => {
        props.setOptions({ ...props.options, size: parseInt(value) });
      }}
    >
      {sizes.map((size: string, index: number) => (
        <Form.Dropdown.Item key={index} value={size} title={size} />
      ))}
    </Form.Dropdown>
  );
};

const IconColor = (props: ConfigureProps): JSX.Element => {
  const infoMessage = props.icon.isColor ? "This icon cannot be colored" : undefined;
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <Form.TextField
      id="iconColor"
      title="Icon Color"
      defaultValue={props.options.color}
      error={error}
      info={infoMessage}
      onChange={(value: string) => {
        value = value.trim();
        const color = d3color(value) || d3color(`#${value}`);
        if (color) {
          setError(undefined);
          props.setOptions({ ...props.options, color: color.formatHex() });
        } else {
          setError("Invalid Color");
        }
      }}
    />
  );
};

const BackgroundColor = (props: ConfigureProps): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <Form.TextField
      id="backgroundColor"
      title="Background Color"
      defaultValue={props.options.bgcolor ? props.options.bgcolor : "Transparent"}
      info="Only applies to SVG"
      error={error}
      onChange={(value: string) => {
        if (["transparent", "none", "clear"].includes(value.trim().toLowerCase())) {
          setError(undefined);
          props.setOptions({ ...props.options, bgcolor: null });
          return;
        }
        const color = d3color(value.trim());
        if (color) {
          setError(undefined);
          props.setOptions({ ...props.options, bgcolor: color.formatHex() });
        } else {
          setError("Invalid color");
        }
      }}
    />
  );
};

const SVGPadding = (props: ConfigureProps): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);
  return (
    <Form.TextField
      id="padding"
      title="Icon Padding"
      defaultValue={props.options.padding.toString()}
      info="Only applies to SVG"
      error={error}
      onChange={(value: string) => {
        const padding = value ? parseInt(value) : 0;
        if (padding >= -50 && padding <= 50) {
          setError(undefined);
          props.setOptions({ ...props.options, padding: padding });
        } else {
          setError("Padding should be between -50 and 50");
        }
      }}
    />
  );
};
