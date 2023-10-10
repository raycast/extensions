const baseUrl = "https://ant.design";

export const getComponentUrl = (link = "") => {
  const href = `${baseUrl}${link}`;
  return href;
};
