import { setSurgeOutboundMode } from "./utils";

export default async function main() {
  try {
    await setSurgeOutboundMode("Rule");
  } catch (error) {
    console.error(error);
    throw error;
  }
}
