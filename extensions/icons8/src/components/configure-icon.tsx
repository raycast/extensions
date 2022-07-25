import { Form, Action, ActionPanel, Icon, useNavigation, showToast, Toast } from "@raycast/api";
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

interface Values {
  downloadName: string;
  downloadPath: string;
  iconColor: string;
  imageSize: string;
  imageFormat: string;
}

const ConfigureIcon = (props: ConfigureProps): JSX.Element => {
  const icon = props.icon;
  const { pop } = useNavigation();

  const handleSubmit = (values: Values) => {
    const color = d3.color(values.iconColor);
    if (color) {
      props.setOptions({
        path: values.downloadPath,
        color: color.formatHex(),
        format: values.imageFormat,
        size: parseInt(values.imageSize),
      });
      pop();
    } else {
      showToast(Toast.Style.Failure, "Invalid Color");
    }
    if (values.downloadName) {
      icon.downloadName = values.downloadName;
    }
  };

  return (
    <Form
      navigationTitle="Configure Icon"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Configuration" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <DownloadName icon={icon} />
      <DownloadPath />
      {!icon.isColor && <IconColor {...props} />}
      <ImageSize {...props} />
      <ImageFormat {...props} />
    </Form>
  );
};

const DownloadName = (props: { icon: Icon8 }): JSX.Element => {
  return <Form.TextField id="downloadName" title="Download Name" placeholder={props.icon.name} />;
};

const DownloadPath = (): JSX.Element => {
  const [error, setError] = useState<string | undefined>(undefined);

  return (
    <Form.TextField
      id="downloadPath"
      title="Download Path"
      defaultValue={defaultDownloadPath}
      error={error}
      onBlur={(e) => {
        if (e.target.value) {
          if (fs.existsSync(e.target.value)) {
            setError(undefined);
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
  return (
    <Form.Dropdown id="imageSize" title="Image Size" defaultValue={props.options.size.toString()}>
      <Form.Dropdown.Item value="64" title="64" />
      <Form.Dropdown.Item value="128" title="128" />
      <Form.Dropdown.Item value="256" title="256" />
      <Form.Dropdown.Item value="512" title="512" />
      <Form.Dropdown.Item value="1024" title="1024" />
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
        } else {
          setError("Invalid Color");
        }
      }}
    />
  );
};
