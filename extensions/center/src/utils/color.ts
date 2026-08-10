export const colors = [
  "#FF5733",
  "#FFC300",
  "#7D3C98",
  "#00C851",
  "#FF4081",
  "#00BFFF",
  "#FFD700",
  "#4B0082",
  "#2ECC71",
  "#9B59B6",
  "#FF7F50",
  "#1ABC9C",
  "#FF69B4",
  "#3498DB",
  "#FF6384",
];

export function getRandomColor() {
  // Get a random index from the array
  const randomIndex = Math.floor(Math.random() * colors.length);
  // Return the string at the random index
  return colors[randomIndex];
}

export function getSuccessColor() {
  return "#00C851";
}

export function getErrorColor() {
  return "#FF5733";
}
