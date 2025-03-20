import convertFiles from "./convert-file";

export default function convertToPDF() {
  return convertFiles({ arguments: { format: "pdf" } });
}
