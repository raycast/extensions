export async function createConversionTask(cloudc: import("cloudconvert"), extension: string) {
  let job;
  try {
    job = await cloudc.jobs.create({
      tasks: {
        Upload: {
          operation: "import/upload",
        },
        Convert: {
          operation: "convert",
          input_format: extension,
          output_format: "pdf",
          engine: "office",
          input: ["Upload"],
          optimize_print: true,
          pdf_a: false,
          include_markup: false,
          output_type: "slides",
          bookmarks: false,
          engine_version: "2.1",
        },
        Export: {
          operation: "export/url",
          input: ["Convert"],
          inline: false,
          archive_multiple_files: false,
        },
      },
      tag: "convert",
    });
  } catch (error) {
    console.log(`this is an custom error : ${error}`);
  }
  return job;
}
