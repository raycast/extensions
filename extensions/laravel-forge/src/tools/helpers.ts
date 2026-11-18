export const nameList = (names: string[], limit = 8) => {
  if (!names.length) return "none";
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
};

// Logs run to megabytes and the whole result is fed to the model
export const tail = (output: string, limit = 4_000) =>
  output.length > limit ? `[earlier output truncated]\n${output.slice(-limit)}` : output;
