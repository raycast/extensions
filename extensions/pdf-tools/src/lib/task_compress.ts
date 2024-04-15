export async function createCompressTask(cloudc: import("cloudconvert"), OptimizeLevel: string) {
  let job;
  try {
    job = await cloudc.jobs.create({
      tasks: {
        Upload: {
          operation: "import/upload",
        },
        Compress: {
          operation: "optimize",
          input: ["Upload"],
          input_format: "pdf",
          engine: "3heights",
          profile: OptimizeLevel as "archive" | "max" | "web" | "mrc",
          flatten_signatures: false,
          engine_version: "6.18",
        },
        Export: {
          operation: "export/url",
          input: ["Compress"],
          inline: false,
          archive_multiple_files: false,
        },
      },
      tag: "compress",
    });
  } catch (error) {
    console.log(`this is an custom error : ${error}`);
  }
  return job;
}
