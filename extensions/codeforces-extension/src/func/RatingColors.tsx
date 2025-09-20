interface ColorScheme {
  background: string;
  text: string;
}

export function getRatingColors(rating: number | undefined): ColorScheme {
  if (!rating) return { background: "#F0F0F0", text: "#808080" };
  if (rating >= 2900) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2600) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2400) return { background: "#FFE5E5", text: "#FF0000" };
  if (rating >= 2300) return { background: "#FFE8D7", text: "#FF8C00" };
  if (rating >= 2200) return { background: "#FFE8D7", text: "#FF8C00" };
  if (rating >= 1900) return { background: "#F8E6F8", text: "#AA01AA" };
  if (rating >= 1600) return { background: "#E6E6FF", text: "#0000FF" };
  if (rating >= 1400) return { background: "#E6FAF9", text: "#05A89F" };
  if (rating >= 1200) return { background: "#E6FFE6", text: "#008001" };
  return { background: "#F0F0F0", text: "#808080" };
}
