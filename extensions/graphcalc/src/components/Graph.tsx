import React from "react";
import {
  Detail,
  ActionPanel,
  Action,
  environment,
  Color,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useGraphData } from "../hooks/useGraphData";
import { useGraphNavigation } from "../hooks/useGraphNavigation";
import { renderGraphToSVG } from "../utils/renderUtils";
import { THEME_COLORS } from "../constants";
import { GraphProps } from "../types";

const Graph: React.FC<GraphProps> = ({ expression }) => {
  const {
    dataSegments,
    result,
    svgRendered,
    lineColor,
    error,
    xMin,
    xMax,
    yMin,
    yMax,
    setXMin,
    setXMax,
    setYMin,
    setYMax,
    setLineColor,
  } = useGraphData(expression);

  const { zoomIn, zoomOut, moveLeft, moveRight, moveUp, moveDown, resetView } =
    useGraphNavigation(
      xMin,
      xMax,
      yMin,
      yMax,
      setXMin,
      setXMax,
      setYMin,
      setYMax,
    );

  const cycleThemeColor = async () => {
    const currentIndex = THEME_COLORS.findIndex(
      (color) => Color[color as keyof typeof Color] === lineColor,
    );
    const nextIndex = (currentIndex + 1) % THEME_COLORS.length;
    const nextColorName = THEME_COLORS[nextIndex];
    const nextColor = Color[nextColorName as keyof typeof Color] as string;
    setLineColor(nextColor);
    await LocalStorage.setItem("lineColor", nextColorName);
    showToast({
      style: Toast.Style.Success,
      title: "Theme Color Changed",
      message: `Graph line color changed to ${nextColorName}.`,
    });
  };

  return (
    <Detail
      markdown={
        error
          ? `## Error\n\n${error}`
          : result !== null
            ? `\\[${expression} = ${result}\\]`
            : svgRendered
              ? `\\begin{math}${expression}\\end{math}\n\n<img src="data:image/svg+xml;utf8,${encodeURIComponent(
                  renderGraphToSVG(
                    expression,
                    dataSegments,
                    [xMin, xMax],
                    [yMin, yMax],
                    lineColor,
                  ),
                )}?color=${encodeURIComponent(lineColor)}&t=${
                  environment.appearance
                }-${lineColor}" alt="Graph" />`
              : `\\begin{math}${expression}\\end{math}\n\n`
      }
      actions={
        !error &&
        result === null && (
          <ActionPanel>
            <Action title="Zoom In" onAction={zoomIn} />
            <Action title="Zoom Out" onAction={zoomOut} />
            <Action
              title="Move Up"
              onAction={moveUp}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
            />
            <Action
              title="Move Down"
              onAction={moveDown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
            />
            <Action
              title="Move Left"
              onAction={moveLeft}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowLeft" }}
            />
            <Action
              title="Move Right"
              onAction={moveRight}
              shortcut={{ modifiers: ["cmd", "shift"], key: "arrowRight" }}
            />
            <Action
              title="Reset View"
              onAction={resetView}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
            <Action
              title="Change Theme Color"
              onAction={cycleThemeColor}
              shortcut={{ modifiers: ["cmd", "shift"], key: ";" }}
            />
          </ActionPanel>
        )
      }
    />
  );
};

export default Graph;
