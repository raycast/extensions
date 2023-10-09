const baseUrl = "https://ant-design.com";

export const getComponentUrl = (link = "") => {
  const href = `${baseUrl}/${link}`;
  return href;
};
