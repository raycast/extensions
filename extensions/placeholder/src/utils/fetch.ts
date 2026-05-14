export const fetchArrayBuffer = async (url: string) => {
  const res = await fetch(url);
  return res.arrayBuffer();
};
