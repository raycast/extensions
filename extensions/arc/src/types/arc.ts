type ArcID = string;

export type ArcItem = {
  id: ArcID;
  title: string | null;
  childrenIds: ArcID[];
  parentID: ArcID | null;
  data:
    | { list: unknown }
    | {
        itemContainer: {
          containerType: {
            spaceItems?: { _0: string[] };
            topApps?: { _0: { default: unknown } };
          };
        };
      }
    | { tab: ArcTab }
    | { easel: ArcEasel }
    | { arcDocument: ArcDocument }
    | { splitView: ArcSplitView };
  createdAt: number;
};

export type ArcTab = {
  activeTabBeforeCreationID: ArcID;
  timeLastActiveAt: number;
  savedMuteStatus: "mute" | "allowAudio";
  savedTitle: string;
  savedURL: string;
  customInfo?: { iconType?: ArcIcon };
  referrerID?: ArcID;
};

export type ArcEasel = {
  easelID: ArcID;
  title: string;
  shareStatus: "creatorOnly" | "readOnly" | "publicReadWrite";
  timeLastActiveAt: number;
  creatorID: string;
  customInfo?: { iconType?: ArcIcon };
};

export type ArcDocument = {
  arcDocumentID: ArcID;
  timeLastActiveAt: number;
  isEditable: boolean;
  customInfo?: { iconType?: ArcIcon };
};

export type ArcSplitView = {
  timeLastActiveAt: number;
  itemWidthFactors: (string | number)[];
  customInfo?: { iconType?: ArcIcon };
};

export type ArcSpace = {
  id: ArcID;
  title?: string;
  customInfo: {
    windowTheme: {
      semanticColorPalette: {
        appearanceBased: {
          light: ArcTheme;
          dark: ArcTheme;
        };
      };
      primaryColorPalette: {
        tintedLight: ArcColor;
        shadedDark: ArcColor;
        midTone: ArcColor;
        shaded: ArcColor;
      };
      background: {
        single: {
          _0: {
            style: {
              color: {
                _0:
                  | {
                      blendedSingleColor: {
                        _0: {
                          color: ArcColor;
                          translucencyStyle: "light" | "dark";
                          modifiers: {
                            overlay: "grain" | "sand" | "denim" | "tweed";
                            noiseFactor: number;
                            intensityFactor: number;
                          };
                        };
                      };
                    }
                  | {
                      blendedGradient: {
                        _0: {
                          baseColors: ArcColor[];
                          overlayColors: ArcColor[];
                          translucencyStyle: "light" | "dark";
                          modifiers: {
                            overlay: "grain" | "sand" | "denim" | "tweed";
                            noiseFactor: number;
                            intensityFactor: number;
                          };
                          wheel: { complimentary: unknown };
                        };
                      };
                    };
              };
            };
            contentOverBackgroundAppearance: "light" | "dark";
            isVibrant: boolean;
          };
        };
      };
    };
    iconType?: ArcIcon;
  };
  profile: { default: unknown };
  containerIDs: ("pinned" | "unpinned" | ArcID)[];
};

export type ArcIcon = {
  icon?: string;
  emoji?: number;
  emoji_v2?: string;
};

export type ArcColor = {
  colorSpace: "extendedSRGB";
  red: number;
  alpha: number;
  blue: number;
  green: number;
};

type ArcTheme = {
  subtitle: ArcColor;
  foregroundSecondary: ArcColor;
  hover: ArcColor;
  foregroundTertiary: ArcColor;
  foregroundPrimary: ArcColor;
  backgroundExtra: ArcColor;
  title: ArcColor;
  background: ArcColor;
  maxContrastColor: ArcColor;
  focus: ArcColor;
  cutoutColor: ArcColor;
  minContrastColor: ArcColor;
};
