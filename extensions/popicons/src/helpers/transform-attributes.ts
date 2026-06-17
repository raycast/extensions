import * as SVG from "svgson";

type AttributeTransformer = (value: string) => string | undefined;

type AttributeTransformerMap = {
  [key: string]: AttributeTransformer;
};

function transformAttributes(svg: string, transformers: AttributeTransformerMap) {
  const svgNode = SVG.parseSync(svg);

  const svgString = SVG.stringify(svgNode, {
    transformAttr(key, value, escape) {
      if (transformers[key]) {
        const transformed = transformers[key](value);
        if (transformed === undefined) {
          return "";
        }

        value = transformed;
      }

      return `${key}="${escape(value)}"`;
    },
  });

  return svgString;
}

export { transformAttributes, type AttributeTransformerMap as AttributeTranformerMap };
