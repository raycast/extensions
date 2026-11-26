import { getFontSearchLinks } from "../utils/fontActions";

type Input = {
  /** Font family name, without weight or style suffixes. */
  family: string;
};

/** Return Google Fonts and web search links for a font family. */
export default function findFont({ family }: Input) {
  return getFontSearchLinks(family);
}
