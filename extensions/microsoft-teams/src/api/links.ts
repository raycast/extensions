export enum CallType {
  Video = "video",
  Audio = "audio",
}

function encodedUsers(addresses: string[]) {
  const validAddresses = addresses.map((address) => address.trim()).filter(Boolean);
  if (validAddresses.length === 0) {
    throw new Error("At least one Microsoft Teams user address is required");
  }
  return validAddresses.map(encodeURIComponent).join(",");
}

export function createChatUrl(addresses: string[], options?: { topic?: string; message?: string }) {
  const parameters = [`users=${encodedUsers(addresses)}`];
  if (options?.topic) {
    parameters.push(`topicName=${encodeURIComponent(options.topic)}`);
  }
  if (options?.message) {
    parameters.push(`message=${encodeURIComponent(options.message)}`);
  }
  return `https://teams.microsoft.com/l/chat/0/0?${parameters.join("&")}`;
}

export function createCallUrl(addresses: string[], callType: CallType) {
  const videoParameter = callType === CallType.Video ? "&withVideo=true" : "";
  return `https://teams.microsoft.com/l/call/0/0?users=${encodedUsers(addresses)}${videoParameter}`;
}
