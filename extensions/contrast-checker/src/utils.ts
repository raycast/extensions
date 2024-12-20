import Color from "colorjs.io";

export const isColor = (input: string): boolean => {
  try {
    new Color(input);
    return true;
  } catch (e) {
    return false;
  }
};

export const getContrastRatio = (textColor: string, backgroundColor: string): string => {
  const text = new Color(textColor);
  const bg = new Color(backgroundColor);
  return text.contrastWCAG21(bg).toFixed(2);
};

export const evaluateContrast = (ratio: number): string => {
  if (ratio > 7) {
    return `## 🟢 Very Good \n\nContrast ratio **${ratio}:1** meets WCAG requirements. \n\nWCAG *Level AAA* compatible.`;
  } else if (ratio > 4.5) {
    return `## 🟡 Good \n\nContrast ratio **${ratio}:1** meets WCAG requirements. \n\nWCAG *Level AA* compatible.`;
  } else {
    return `## 🔴 Poor \n\nContrast ratio **${ratio}:1** does not meet WCAG requirements.`;
  }
};
