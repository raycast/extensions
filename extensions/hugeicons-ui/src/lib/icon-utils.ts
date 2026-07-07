import { environment } from "@raycast/api";

export function getDisplayColor(colorValue: string): string {
  if (colorValue === "auto") {
    return environment.appearance === "dark" ? "#FFFFFF" : "#000000";
  }

  return colorValue;
}

export function colorSvg(svg: string, colorValue: string): string {
  const color = getDisplayColor(colorValue);

  return svg
    .replace(/stroke="#[0-9A-Fa-f]{6}"/g, `stroke="${color}"`)
    .replace(/fill="#[0-9A-Fa-f]{6}"/g, `fill="${color}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`)
    .replace(/fill="currentColor"/g, `fill="${color}"`);
}

export function svgToDataUri(svg: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  return `data:image/svg+xml,${encodeURIComponent(coloredSvg)}`;
}

function toPascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

export function svgToJsx(svg: string, componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  const jsxSvg = coloredSvg
    .replace(/class=/g, "className=")
    .replace(/stroke-width=/g, "strokeWidth=")
    .replace(/stroke-linecap=/g, "strokeLinecap=")
    .replace(/stroke-linejoin=/g, "strokeLinejoin=")
    .replace(/fill-rule=/g, "fillRule=")
    .replace(/clip-rule=/g, "clipRule=")
    .replace(/clip-path=/g, "clipPath=")
    .replace(/stroke-miterlimit=/g, "strokeMiterlimit=")
    .replace(/stroke-dasharray=/g, "strokeDasharray=")
    .replace(/stroke-dashoffset=/g, "strokeDashoffset=")
    .replace(/fill-opacity=/g, "fillOpacity=")
    .replace(/stroke-opacity=/g, "strokeOpacity=");
  const pascalName = toPascalCase(componentName);

  return `const ${pascalName}Icon = (props) => (
  ${jsxSvg.replace("<svg", "<svg {...props}")}
);

export default ${pascalName}Icon;`;
}

export function svgToVue(svg: string, componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);
  const pascalName = toPascalCase(componentName);

  return `<template>
  ${coloredSvg.replace("<svg", '<svg v-bind="$attrs"')}
</template>

<script>
export default {
  name: '${pascalName}Icon',
  inheritAttrs: false
}
</script>`;
}

export function svgToSvelte(svg: string, _componentName: string, colorValue: string): string {
  const coloredSvg = colorSvg(svg, colorValue);

  return `<script>
  export let size = 24;
  export let color = "currentColor";
</script>

${coloredSvg.replace("<svg", "<svg {...$$restProps} width={size} height={size}")}`;
}
