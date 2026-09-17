import ColorJS from "colorjs.io";

type Input = {
  foreground: string;
  background: string;
};

export default function analyzeContrast(input: Input) {
  try {
    const foreground = new ColorJS(input.foreground);
    const background = new ColorJS(input.background);

    if (foreground.alpha < 1 || background.alpha < 1) {
      throw new Error("Contrast analysis requires opaque colors.");
    }

    const ratio = ColorJS.contrast(background, foreground, "WCAG21");

    return {
      foreground: toHex(foreground),
      background: toHex(background),
      ratio: Number(ratio.toFixed(2)),
      passes: {
        aaNormalText: ratio >= 4.5,
        aaLargeText: ratio >= 3,
        aaaNormalText: ratio >= 7,
        aaaLargeText: ratio >= 4.5,
        nonText: ratio >= 3,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Contrast analysis requires opaque colors.") throw error;
    throw new Error("Provide two valid CSS colors.");
  }
}

function toHex(color: ColorJS) {
  return color.to("srgb").toGamut({ method: "clip" }).toString({ format: "hex", collapse: false }).toUpperCase();
}
