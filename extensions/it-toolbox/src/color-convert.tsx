import { Icon } from "@raycast/api";
import { contrastRatio, parseColor, rgbToCmyk, rgbToHex, rgbToHsl } from "./utils/toolbox";
import { InputForm } from "./components/InputForm";
import { ResultRow } from "./components/ResultList";

export default function Command() {
  return (
    <InputForm
      inputTitle="Color Value"
      placeholder="#3B82F6 / rgb(59,130,246) / hsl(217,91%,60%)"
      initialValue="#3B82F6"
      compute={(values) => {
        const input = (values.input ?? "").trim();
        if (!input) return [];
        try {
          const rgb = parseColor(input);
          const hex = rgbToHex(rgb);
          const hsl = rgbToHsl(rgb);
          const cmyk = rgbToCmyk(rgb);
          const contrastWithWhite = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
          const contrastWithBlack = contrastRatio(rgb, { r: 0, g: 0, b: 0 });

          return [
            { id: "hex", title: hex.toUpperCase(), subtitle: "HEX", icon: Icon.Brush, copyValue: hex.toUpperCase() },
            {
              id: "rgb",
              title: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
              subtitle: "RGB",
              icon: Icon.Brush,
              copyValue: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
            },
            {
              id: "hsl",
              title: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
              subtitle: "HSL",
              icon: Icon.Brush,
              copyValue: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
            },
            {
              id: "cmyk",
              title: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
              subtitle: "CMYK",
              icon: Icon.Brush,
              copyValue: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
            },
            {
              id: "long",
              title: String((rgb.r << 16) + (rgb.g << 8) + rgb.b),
              subtitle: "Decimal Color Value",
              icon: Icon.Number00,
            },
            {
              id: "contrast-white",
              title: `${contrastWithWhite}:1`,
              subtitle: `On white · ${contrastWithWhite >= 4.5 ? "passes AA" : "fails AA"}`,
              icon: Icon.Eye,
            },
            {
              id: "contrast-black",
              title: `${contrastWithBlack}:1`,
              subtitle: `On black · ${contrastWithBlack >= 4.5 ? "passes AA" : "fails AA"}`,
              icon: Icon.Eye,
            },
            {
              id: "preview",
              title: `▉▉▉ ${hex.toUpperCase()}`,
              subtitle: "Swatch",
              detail: `Color preview: ${hex.toUpperCase()}\nRGB: ${rgb.r}, ${rgb.g}, ${rgb.b}\nHSL: ${hsl.h}°, ${hsl.s}%, ${hsl.l}%`,
              icon: Icon.Brush,
              copyValue: hex,
            },
          ] as ResultRow[];
        } catch (error) {
          return [
            {
              id: "error",
              title: "Could not parse the color",
              detail: (error as Error).message,
              icon: Icon.CircleDisabled,
              copyValue: (error as Error).message,
            },
          ];
        }
      }}
    />
  );
}
