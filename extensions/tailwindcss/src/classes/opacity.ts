import { TailwindConfig, Titles, opacity } from "./types";

export default (Tailwind: TailwindConfig) => {
  opacity.forEach((n) => {
    Tailwind[Titles.Opacity][`opacity-${n}`] = {
      value: `opacity: ${n / 100}`,
      description: "",
    };
  });
};
