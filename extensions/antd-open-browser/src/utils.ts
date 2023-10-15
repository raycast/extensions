const baseUrl = "https://ant-design.antgroup.com";

export const getComponentUrl = (filename = "") => {
  const url = `${filename.replace(/(\/index)?((\.zh-cn)|(\.en-us))?\.md$/i, "").toLowerCase()}/`;
  const href = url.startsWith("http") ? url : `${baseUrl}/${url.replace(/\/$/, "-cn/")}`;
  return href;
};
