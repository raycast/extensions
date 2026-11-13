import ColorJS from "colorjs.io";

type Input = {
  color: string;
};

const labels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

export default function generateColorScale(input: Input) {
  try {
    const color = new ColorJS(input.color);
    if (color.alpha < 1) throw new Error();

    const colors = [
      ...ColorJS.steps("#FFFFFF", color, { steps: 6, space: "oklch" }),
      ...ColorJS.steps(color, "#000000", { steps: 6, space: "oklch" }).slice(1),
    ];

    return {
      baseColor: toHex(color),
      colorSpace: "oklch",
      scale: labels.map((label, index) => ({ label, color: toHex(colors[index]) })),
    };
  } catch {
    throw new Error(`"${input.color}" is not a valid opaque color.`);
  }
}

function toHex(color: ColorJS) {
  return color.to("srgb").toGamut({ method: "clip" }).toString({ format: "hex", collapse: false }).toUpperCase();
}
