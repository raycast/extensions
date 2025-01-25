import pdfmake from "pdfmake";
import { getOutputPath } from "#/utils";
import type { Operation, Image } from "#/types";

const SUPPORTED_FORMATS = ["jpeg", "png"];

pdfmake.addFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});

export const run: Operation.Run = async ({ images }) => {
  for (const image of images) {
    if (!SUPPORTED_FORMATS.includes(image.format)) {
      throw new Error(
        `pdf command does not support format '${image.format}', only supports ${SUPPORTED_FORMATS.join(", ")}`,
      );
    }
  }

  const outputs = await Promise.all(
    images.map(async (image) => {
      const write = createWrite(image);
      return {
        ...image,
        sharp: undefined,
        write,
      };
    }),
  );
  return outputs;
};

function createWrite(image: Image) {
  return async function write() {
    const docDefinition = {
      defaultStyle: {
        font: "Helvetica",
      },
      pageSize: { width: image.width, height: image.height },
      pageMargins: [0, 0],
      content: [{ image: await toDataUrl(image) }],
    };
    const pdf = pdfmake.createPdf(docDefinition);
    const outputPath = await getOutputPath(image.path, "pdf");
    await pdf.write(outputPath);
  };
}

async function toDataUrl(image: Image) {
  const buffer = await image.data.toBuffer();
  const data = buffer.toString("base64");
  return `data:image/${image.format};base64,${data}`;
}
