import { Detail } from "@raycast/api";

import { capitalize } from "./utils/capitalize";

export default function Details(props: { type: string; i?: string; o?: string; value: string }) {
  const { type, i, o, value } = props;

  const valueToPoints = value.split(",");
  const x1 = valueToPoints[0];
  const y1 = valueToPoints[1];
  const x2 = valueToPoints[2];
  const y2 = valueToPoints[3];

  return (
    <Detail
      markdown={`# Ease ${capitalize((i && i + " ") || "") + capitalize((o && o + " ") || "") + capitalize(type)}\n**X1: ${x1} | Y1: ${y1} | X2: ${x2} | Y2: ${y2}**\n\n![Ease ${capitalize((i && i + " ") || "") + capitalize((o && o + " ") || "") + capitalize(type)}](animation-ease-${(i && i + "-") || ""}${(o && o + "-") || ""}${type}.gif)`}
    />
  );
}
