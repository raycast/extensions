export type RaycastWallpaper = { title: string; url: string };

export const raycastWallpaper = [
  { title: "Autumnal Peach", url: "autumnal-peach.png" },
  { title: "Blossom", url: "blossom.png" },
  { title: "Blushing Fire", url: "blushing-fire.png" },
  { title: "Bright Rain", url: "bright-rain.png" },
  { title: "Floss", url: "floss.png" },
  { title: "Glass Rainbow", url: "glass-rainbow.png" },
  { title: "Good Vibes", url: "good-vibes.png" },
  { title: "Moonrise", url: "moonrise.png" },
  { title: "Ray of Lights", url: "ray-of-lights.png" },
  { title: "Rose Thorn", url: "rose-thorn.png" },
];

export const buildImageURL = (urlSuffix: string) => {
  return "https://www.raycast.com/uploads/wallpapers/" + urlSuffix;
};
