const WIDTH = "512";
const HEIGHT = "287";

export const renderDetails = (item: { thumbnail_url: string }) => {
  const thumbnail_url = item.thumbnail_url.replace(/%?\{width\}/, WIDTH).replace(/%?\{height\}/, HEIGHT);
  return `<img alt="Twitch Thumbnail" src="${thumbnail_url}" height="${HEIGHT}" width="${WIDTH}" />`;
};
