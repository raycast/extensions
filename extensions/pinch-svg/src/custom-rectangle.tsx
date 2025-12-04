import { Clipboard, LaunchProps, showToast, Toast, showHUD, popToRoot } from "@raycast/api";
import { useEffect } from "react";

type RectangleFormInput = {
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  strokeColor: string;
  bgColor: string;
};

export default function GenerateSvgRectangle(props: LaunchProps<{ arguments: { width: string; height: string } }>) {
  const { width, height } = props.arguments;

  // Validate the input arguments to ensure they are numbers
  const initialWidth = parseInt(width, 10);
  const initialHeight = parseInt(height, 10);

  useEffect(() => {
    const generateSvg = async () => {
      if (isNaN(initialWidth) || isNaN(initialHeight)) {
        await popToRoot();
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Input",
          message: "Width and Height must be numbers",
        });
        return;
      }

      const rectangle: RectangleFormInput = {
        width: initialWidth,
        height: initialHeight,
        color: "#FF000040",
        strokeWidth: 4,
        strokeColor: "#FF0000",
        bgColor: "#ffffff",
      };

      const { width, height, color, strokeWidth, strokeColor, bgColor } = rectangle;
      const x = strokeWidth / 2;
      const y = strokeWidth / 2;

      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background-color: ${bgColor}">
          <rect x="${x}" y="${y}" width="${width - x * 2}" height="${height - y * 2}" fill="${color}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
          <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14">${width} x ${height}</text>
        </svg>
      `;

      try {
        await Clipboard.copy(svg);
        await showHUD("SVG copied to clipboard!");
        await popToRoot();
      } catch (error) {
        await popToRoot();
        showToast({
          title: "Failed to copy SVG",
          message: "Failed to copy SVG",
        });
      }
    };

    generateSvg();
  }, [initialWidth, initialHeight]);

  return null;
}
