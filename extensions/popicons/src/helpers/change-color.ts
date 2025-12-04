import { AttributeTranformerMap, transformAttributes } from "./transform-attributes";

function changeColor(svg: string, color: string): string {
  const transformers: AttributeTranformerMap = {
    fill: (value: string) => {
      if (value !== "none") {
        return color;
      }

      return value;
    },
    stroke: (value: string) => {
      if (value !== "none") {
        return color;
      }

      return value;
    },
  };

  return transformAttributes(svg, transformers);
}

export { changeColor };
