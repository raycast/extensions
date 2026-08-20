// Mirrors SpriteVariant.groups in Sources/SpriteSheet.swift; `value` is the
// rawValue the oneko://skin/<value> URL expects, and the thumbnail file name
// in assets/skins/ (regenerate with `swift tools/makethumbs.swift`).
export interface Skin {
  value: string;
  title: string;
}

export const SKIN_GROUPS: { name: string; skins: Skin[] }[] = [
  {
    name: "Classic",
    skins: [
      { value: "cat", title: "Cat" },
      { value: "dog", title: "Dog" },
    ],
  },
  {
    name: "X11 Originals",
    skins: [
      { value: "tora-x11", title: "Tora" },
      { value: "sakura", title: "Sakura" },
      { value: "tomoyo", title: "Tomoyo" },
      { value: "bsd", title: "BSD Daemon" },
    ],
  },
  {
    name: "Community",
    skins: [
      { value: "ace", title: "Ace" },
      { value: "black", title: "Black" },
      { value: "bunny", title: "Bunny" },
      { value: "calico", title: "Calico" },
      { value: "catppuccin", title: "Catppuccin" },
      { value: "eevee", title: "Eevee" },
      { value: "esmeralda", title: "Esmeralda" },
      { value: "fox", title: "Fox" },
      { value: "ghost", title: "Ghost" },
      { value: "gray", title: "Gray" },
      { value: "jess", title: "Jess" },
      { value: "kina", title: "Kina" },
      { value: "lucy", title: "Lucy" },
      { value: "maia", title: "Maia" },
      { value: "maria", title: "Maria" },
      { value: "mike", title: "Mike" },
      { value: "silver", title: "Silver" },
      { value: "silversky", title: "Silver Sky" },
      { value: "spirit", title: "Spirit" },
      { value: "valentine", title: "Valentine" },
      { value: "vaporwave", title: "Vaporwave" },
    ],
  },
];
