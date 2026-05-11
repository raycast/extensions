export const LIST_IMAGE_URL = "https://picsum.photos/v2/list";

export const prefix = "https://picsum.photos/id/";
export const buildGridContentImageURL = (coloums: number, id: string) => {
  if (coloums <= 3) {
    return prefix + id + "/300";
  } else if (coloums <= 6) {
    return prefix + id + "/150";
  } else {
    return prefix + id + "/100";
  }
};
