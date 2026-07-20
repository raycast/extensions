export const weights = ["thin", "light", "regular", "bold", "fill", "duotone"];

export const getIconUrl = (icon: string, weight: string) => {
  if (weight === "regular") {
    return `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/${weight}/${icon}.svg`;
  }

  return `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/${weight}/${icon}-${weight}.svg`;
};

export const getRawIconUrl = (icon: string, weight: string) => {
  if (weight === "regular") {
    return `https://raw.githubusercontent.com/phosphor-icons/core/main/raw/${weight}/${icon}.svg`;
  }

  return `https://raw.githubusercontent.com/phosphor-icons/core/main/raw/${weight}/${icon}-${weight}.svg`;
};
