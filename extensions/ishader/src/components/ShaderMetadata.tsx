import { Detail } from "@raycast/api";
import { ShaderConfig } from "../config/shaders";
import { ParametersRecord } from "../config/types";

interface ShaderMetadataProps {
  shaderConfig: ShaderConfig;
  parameters: ParametersRecord;
  imageName: string;
  stepSize: string;
  zoomScale: number;
}

export function ShaderMetadata({ shaderConfig, parameters, imageName, stepSize, zoomScale }: ShaderMetadataProps) {
  const metadataParams = shaderConfig.parameters.filter((p) => p.metadata);

  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Original File" text={imageName} />
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Shader Type" text={shaderConfig.name} />

      {metadataParams.map((param) => {
        let displayValue: string;

        switch (param.type) {
          case "bool":
            displayValue = parameters[param.id] ? "Yes" : "No";
            break;

          case "enum": {
            const option = param.options?.find((opt) => opt.value === String(parameters[param.id]));
            displayValue = option?.label || String(parameters[param.id]);
            break;
          }

          case "string": {
            const strValue = String(parameters[param.id] || "");
            displayValue = strValue.length > 20 ? strValue.substring(0, 20) + "..." : strValue;
            break;
          }

          case "int":
            displayValue = String(Math.floor(Number(parameters[param.id])));
            break;

          case "float": {
            const floatValue = Number(parameters[param.id]);
            displayValue = floatValue % 1 === 0 ? floatValue.toString() : parseFloat(floatValue.toFixed(2)).toString();
            break;
          }

          default:
            displayValue = String(parameters[param.id] || "");
        }

        let label = param.label;
        if (param.shortcut && param.decrementShortcut) {
          label = `${param.label} ${param.decrementShortcut.key}/${param.shortcut.key}`;
        } else if (param.incrementShortcut && param.decrementShortcut) {
          label = `${param.label} ${param.decrementShortcut.key}/${param.incrementShortcut.key}`;
        } else if (param.shortcut) {
          label = `${param.label} ${param.shortcut.key}`;
        }

        return <Detail.Metadata.Label key={param.id} title={label} text={displayValue} />;
      })}

      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Step Size [/]" text={stepSize} />
      <Detail.Metadata.Label title="Preview Zoom -/+" text={`${zoomScale.toFixed(2)}x`} />
      <Detail.Metadata.Label title="Save Image s" text="" />
    </Detail.Metadata>
  );
}
