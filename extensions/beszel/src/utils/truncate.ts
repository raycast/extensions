export const truncateText = (value: string, maxLength = 45, truncatePosition: "end" | "mid" = "end") => {
  if (value.length > maxLength) {
    if (truncatePosition === "end") {
      return value.substring(0, maxLength - 3) + "...";
    } else {
      return [
        value.substring(0, (maxLength - 3) / 2),
        "...", // placeholder
        value.substring((maxLength - 3) / 2, maxLength),
      ].join("");
    }
  }

  return value;
};
