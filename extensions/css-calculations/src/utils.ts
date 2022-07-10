export type Values = {
  min_font_size: number;
  max_font_size: number;
  min_vw_width: number;
  max_vw_width: number;
  pixels_per_rem: number;
};

type Modes = "px" | "rem";

function parseValue(value: number): number {
  return parseFloat(value.toFixed(4));
}

export function calculateClamp(values: Values, mode: Modes): string {
  const min_font_size_rem =
    mode === "px" ? Number(values.min_font_size) / Number(values.pixels_per_rem) : Number(values.min_font_size);
  const max_font_size_rem =
    mode === "px" ? Number(values.max_font_size) / Number(values.pixels_per_rem) : Number(values.max_font_size);
  const min_vw_width_rem = Number(values.min_vw_width) / Number(values.pixels_per_rem);
  const max_vw_width_rem = Number(values.max_vw_width) / Number(values.pixels_per_rem);

  const slope = (max_font_size_rem - min_font_size_rem) / (max_vw_width_rem - min_vw_width_rem);
  const yAxisIntersection = -min_vw_width_rem * slope + min_font_size_rem;

  return `clamp(${parseValue(min_font_size_rem)}rem, ${parseValue(yAxisIntersection)}rem + ${parseValue(
    slope * 100
  )}vw, ${parseValue(max_font_size_rem)}rem)`;
}

function firstLetterUpper(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function parseKey(key: string): string | undefined {
  switch (key) {
    case "min_font_size":
      return firstLetterUpper("Min Font Size");
    case "max_font_size":
      return firstLetterUpper("Max Font Size");
    case "min_vw_width":
      return firstLetterUpper("Min Viewport Width");
    case "max_vw_width":
      return firstLetterUpper("Max Viewport Width");
    case "pixels_per_rem":
      return firstLetterUpper("Base Font Size");
  }
}

export function validateValues(values: Values): void {
  Object.entries(values).forEach(([key, value]) => {
    if (!value) {
      throw new Error(parseKey(key) + " can not be empty!");
    }

    if (isNaN(value)) {
      throw new Error(parseKey(key) + " is not a number!");
    }

    if (value < 0) {
      throw new Error(parseKey(key) + " must be grater than 0!");
    }
  });
}
