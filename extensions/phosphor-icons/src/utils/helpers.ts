export const getIconUrl = (icon: string, weight: string) => {
  if (weight === "regular") {
    return `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/${weight}/${icon}.svg`;
  }

  return `https://raw.githubusercontent.com/phosphor-icons/core/main/assets/${weight}/${icon}-${weight}.svg`;
};
