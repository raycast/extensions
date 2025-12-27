/**
 * Detects the public IP address by querying an external service
 */
export async function detectIP(): Promise<string> {
  const response = await fetch("https://api.ipify.org?format=json");
  const data = (await response.json()) as { ip?: string };
  return data.ip || "Unable to detect";
}
