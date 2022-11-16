import { environment } from "@raycast/api";

export const listIcons = [
  "a.png",
  "b.png",
  "c.png",
  "d.png",
  "e.png",
  "f.png",
  "g.png",
  "h.png",
  "i.png",
  "j.png",
  "k.png",
  "l.png",
  "m.png",
  "n.png",
  "o.png",
  "p.png",
  "q.png",
  "r.png",
  "s.png",
  "t.png",
  "u.png",
  "v.png",
  "w.png",
  "x.png",
  "y.png",
  "z.png",
];

const calculateLetterIndex = (char: string) => {
  return char.charCodeAt(0) - "a".charCodeAt(0);
};

const raycastTheme = environment.theme;
export const getListIcon = (name: string) => {
  let assetsFolder: string;
  if (raycastTheme == "light") {
    assetsFolder = "list-icon/";
  } else {
    assetsFolder = "list-icon@dark/";
  }
  return assetsFolder + listIcons[calculateLetterIndex(name.toLowerCase())];
};
