import { ActionPanel, Action, Icon } from "@raycast/api";
import { ShaderConfig, ShaderParameter } from "../config/shaders";
import { convertShortcut, ParametersRecord, ParameterValue } from "../config/types";

interface ShaderActionsProps {
  shaderConfig: ShaderConfig;
  allShaderConfigs: ShaderConfig[];
  currentShaderId: string;
  parameters: ParametersRecord;
  onParameterChange: (id: string, value: ParameterValue) => void;
  onShaderChange: (shaderId: string) => void;
  stepSize: string;
  onStepSizeChange: (newStepSize: string) => void;
  onStepSizeFormOpen: () => void;
  onShaderSettingsOpen?: () => void;
  fullOutputPath: string | null;
  onSaveClick: () => void;
  onSelectDifferentImage: () => void;
  zoomScale: number;
  onZoomIncrease: () => void;
  onZoomDecrease: () => void;
  onZoomReset: () => void;
  onParameterChangeWithStepSize?: (id: string, delta: number) => void;
}

export function ShaderActions({
  shaderConfig,
  allShaderConfigs,
  currentShaderId,
  parameters,
  onParameterChange,
  onShaderChange,
  stepSize,
  onStepSizeChange,
  onStepSizeFormOpen,
  onShaderSettingsOpen,
  fullOutputPath,
  onSaveClick,
  onSelectDifferentImage,
  onZoomIncrease,
  onZoomDecrease,
  onZoomReset,
  onParameterChangeWithStepSize,
}: ShaderActionsProps) {
  const renderParameterAction = (param: ShaderParameter) => {
    const value = parameters[param.id];

    switch (param.type) {
      case "bool":
        return (
          <Action
            key={param.id}
            icon={value ? Icon.Checkmark : Icon.XMarkCircle}
            title={`${param.label}: ${value ? "On" : "Off"}`}
            onAction={() => onParameterChange(param.id, !value)}
            shortcut={convertShortcut(param.shortcut)}
          />
        );

      case "float":
      case "int": {
        const step = param.step || (param.type === "int" ? 1 : 0.1);
        const numValue = Number(value);
        const max = param.max ?? Infinity;
        const min = param.min ?? -Infinity;

        const effectiveStep =
          param.id === "blur" && onParameterChangeWithStepSize ? parseInt(stepSize || "1", 10) : step;

        const isOddOnlyPixelSize = param.id === "pixelSize" && shaderConfig.id === "dither";

        return [
          <Action
            key={`${param.id}-increase`}
            icon={Icon.Plus}
            title={`Increase ${param.label}`}
            onAction={() => {
              if (param.id === "blur" && onParameterChangeWithStepSize) {
                onParameterChangeWithStepSize(param.id, effectiveStep);
              } else if (isOddOnlyPixelSize) {
                const currentOdd = numValue | 1;
                const newOddValue = Math.min(max, currentOdd + 2);
                onParameterChange(param.id, newOddValue);
              } else {
                const newValue = Math.min(max, numValue + step);
                onParameterChange(param.id, param.type === "int" ? Math.floor(newValue) : newValue);
              }
            }}
            shortcut={convertShortcut(param.shortcut || param.incrementShortcut)}
          />,
          <Action
            key={`${param.id}-decrease`}
            icon={Icon.Minus}
            title={`Decrease ${param.label}`}
            onAction={() => {
              if (param.id === "blur" && onParameterChangeWithStepSize) {
                onParameterChangeWithStepSize(param.id, -effectiveStep);
              } else if (isOddOnlyPixelSize) {
                const currentOdd = numValue | 1;
                const newOddValue = Math.max(min, currentOdd - 2);
                onParameterChange(param.id, Math.max(1, newOddValue));
              } else {
                const newValue = Math.max(min, numValue - step);
                onParameterChange(param.id, param.type === "int" ? Math.floor(newValue) : newValue);
              }
            }}
            shortcut={convertShortcut(param.decrementShortcut)}
          />,
        ];
      }

      case "enum":
        return (
          <Action
            key={param.id}
            icon={Icon.Switch}
            title={`${param.label}: ${param.options?.find((opt) => opt.value === String(value))?.label || value}`}
            onAction={() => {
              const options = param.options || [];
              const currentIndex = options.findIndex((opt) => opt.value === String(value));
              const nextIndex = (currentIndex + 1) % options.length;
              onParameterChange(param.id, options[nextIndex].value);
            }}
            shortcut={convertShortcut(param.shortcut)}
          />
        );

      case "string":
        return null;

      default:
        return null;
    }
  };

  const effectParams = shaderConfig.parameters.filter((p) => p.category === "effect");
  const preprocessingParams = shaderConfig.parameters.filter((p) => p.category === "preprocessing");

  return (
    <ActionPanel>
      <Action icon={Icon.Folder} title="Select Different Image" onAction={onSelectDifferentImage} />
      {fullOutputPath && (
        <>
          <Action
            icon={Icon.Download}
            title="Save Image"
            onAction={onSaveClick}
            shortcut={{ modifiers: [], key: "s" }}
          />
          <Action.ShowInFinder path={fullOutputPath} />
        </>
      )}

      <ActionPanel.Section title="Effects">
        {allShaderConfigs.map((shader) => (
          <Action
            key={shader.id}
            icon={currentShaderId === shader.id ? Icon.Checkmark : Icon.Circle}
            title={shader.name}
            onAction={() => onShaderChange(shader.id)}
          />
        ))}
      </ActionPanel.Section>

      <ActionPanel.Section title="Effect Settings">
        {onShaderSettingsOpen && (
          <Action icon={Icon.Gear} title={`Configure ${shaderConfig.name} Settings`} onAction={onShaderSettingsOpen} />
        )}
        <Action icon={Icon.Gear} title={`Set Step Size (Current: ${stepSize})`} onAction={onStepSizeFormOpen} />
        <Action
          icon={Icon.Plus}
          title="Increase Step Size"
          shortcut={{ modifiers: [], key: "]" }}
          onAction={() => {
            const newStep = (parseInt(stepSize || "1", 10) + 1).toString();
            onStepSizeChange(newStep);
          }}
        />
        <Action
          icon={Icon.Minus}
          title="Decrease Step Size"
          shortcut={{ modifiers: [], key: "[" }}
          onAction={() => {
            const newStep = Math.max(1, parseInt(stepSize || "1", 10) - 1).toString();
            onStepSizeChange(newStep);
          }}
        />
        {effectParams
          .filter((param) => param.type !== "string")
          .map((param) => renderParameterAction(param))
          .flat()
          .filter((action) => action !== null)}
      </ActionPanel.Section>

      <ActionPanel.Section title="Preprocessing">
        {preprocessingParams
          .map((param) => renderParameterAction(param))
          .flat()
          .filter((action) => action !== null)}
      </ActionPanel.Section>

      <ActionPanel.Section title="Preview">
        <Action
          icon={Icon.Plus}
          title="Increase Preview Zoom"
          shortcut={{ modifiers: [], key: "=" }}
          onAction={onZoomIncrease}
        />
        <Action
          icon={Icon.Minus}
          title="Decrease Preview Zoom"
          shortcut={{ modifiers: [], key: "-" }}
          onAction={onZoomDecrease}
        />
        <Action icon={Icon.ArrowClockwise} title="Reset Preview Zoom" onAction={onZoomReset} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
