import { Form, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { downloadPath as defaultDownloadPath } from "./actions";
import { Icon8 } from "../types/types";
import * as d3 from "d3-color";
import fs from "fs";

interface ConfigureProps {
  icon: Icon8;
  options: any;
  setOptions: (options: any) => void;
}

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
      {!props.icon.isColor && <IconColor {...props} />}
      <ImageSize {...props} />
      <ImageFormat {...props} />
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
      defaultValue={defaultDownloadPath}
      error={error}
      onChange={(value: string) => {
        if (value) {
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
        props.setOptions({ ...props.options, format: value });
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
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <Form.TextField
      id="iconColor"
      title="Icon Color"
      defaultValue={props.options.color}
      error={error}
      onChange={(value: string) => {
        const color = d3.color(value.trim());
        if (color !== null) {
          setError(undefined);
          props.setOptions({ ...props.options, color: color.formatHex() });
        } else {
          setError("Invalid Color");
        }
      }}
    />
  );
};
