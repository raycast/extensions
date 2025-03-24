export const getDoorModeTitle = (mode: "open" | "normal" | "closed") => {
  switch (mode) {
    case "open":
      return "Permanent Open";
    case "normal":
      return "Normal";
    case "closed":
      return "Locked";
    default:
      return "Unknown";
  }
};
