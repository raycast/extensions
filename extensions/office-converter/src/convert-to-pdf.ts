import convertFiles from "./convert-file";

export default async function convertToPDF(props: Parameters<typeof convertFiles>[0]) {
  await convertFiles({ ...props, arguments: { ...props.arguments, format: "pdf" } });
}
