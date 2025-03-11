export function swapCommasAndDots(text: string) {
  return text.replace(/[.,]/g, (val) => (val === "." ? "," : "."));
}
