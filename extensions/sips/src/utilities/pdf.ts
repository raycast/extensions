import { runAppleScript } from "@raycast/utils";

export async function makePDF(imagePaths: string[], outputPath: string) {
  return runAppleScript(
    `function run() {
      ObjC.import("AppKit");
      ObjC.import("PDFKit");
      
      const document = $.PDFDocument.alloc.init;
      
      const sourcePaths = $.NSArray.arrayWithArray(["${imagePaths.join('", "')}"]);
      sourcePaths.enumerateObjectsUsingBlock((filePath, idx, stop) => {
        const image = $.NSImage.alloc.initWithContentsOfFile(filePath);
        const page = $.PDFPage.alloc.initWithImage(image);
        document.insertPageAtIndex(page, idx);
      })
      
      document.writeToFile("${outputPath}");
    }`,
    {
      language: "JavaScript",
    },
  );
}
