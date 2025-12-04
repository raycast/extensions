import { encode } from "js-base64";
import { IIconConfig } from "@icon-park/svg/lib/runtime";

export { buildIconBase, kebabToOtherCase, toBase64 };

function buildIconBase(iiconConfig: IIconConfig) {
  return {
    size: iiconConfig.size,
    strokeWidth: iiconConfig.strokeWidth,
    strokeLinecap: iiconConfig.strokeLinecap,
    strokeLinejoin: iiconConfig.strokeLinejoin,
    theme: iiconConfig.theme,
    fill: buildIconFill(iiconConfig),
  };
}

function buildIconFill(iiconConfig: IIconConfig) {
  const fillColor: string[] = [];
  switch (iiconConfig.theme) {
    case "outline": {
      fillColor.push(iiconConfig.colors.outline.fill);
      fillColor.push(iiconConfig.colors.outline.background);
      break;
    }
    case "filled": {
      fillColor.push(iiconConfig.colors.filled.fill);
      fillColor.push(iiconConfig.colors.filled.background);
      break;
    }
    case "two-tone": {
      fillColor.push(iiconConfig.colors.twoTone.fill);
      fillColor.push(iiconConfig.colors.twoTone.twoTone);
      break;
    }
    case "multi-color": {
      fillColor.push(iiconConfig.colors.multiColor.outStrokeColor);
      break;
    }
  }
  return fillColor;
}

function kebabToOtherCase(str: string, join: string = ""): string {
  const kebabArr = str.split("-");
  const _arr = kebabArr.map((value) => {
    if (value.length === 1) {
      return value.toUpperCase();
    } else {
      return value[0].toUpperCase() + value.substring(1);
    }
  });
  return _arr.join(join);
}

function toBase64(svg: string | undefined): string {
  if (!svg) {
    return "";
  }
  return `data:image/svg+xml;base64,${encode(svg)}`;
}
