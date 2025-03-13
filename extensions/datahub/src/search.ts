import { open } from "@raycast/api";
import { DATAHUB_FRONTEND } from "./utils/constants";

interface Arguments {
  query: string;
}

export default async function main(props: { arguments: Arguments }) {
  const { query } = props.arguments;
  const url = `${DATAHUB_FRONTEND}/search?page=1&query=${encodeURIComponent(query)}&unionType=0`;
  try {
    await open(url);
  } catch (error) {
    console.error("Failed to open URL:", error);
    throw error;
  }
}
