import { switchSurgeOutboundMode } from "./utils";

export default async function main() {
  try {
    await switchSurgeOutboundMode("Rule");
  } catch (error) {
    console.error(error);
    throw error;
  }
}
