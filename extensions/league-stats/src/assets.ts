import { Icon, Image } from "@raycast/api";
import { CDRAGON, DDRAGON, Statics, versionForPatch } from "./ddragon";

function rounded(source: string, fallback: Image.Fallback): Image.ImageLike {
  return { source, mask: Image.Mask.RoundedRectangle, fallback };
}

/**
 * Names and images for champions, items, spells and profile icons, all from Riot's public CDNs.
 * Until the static tables have loaded (or if they cannot), everything degrades to a neutral icon or a raw ID.
 */
export class Assets {
  constructor(private readonly statics: Statics | undefined) {}

  championName(id: number, fallback: string): string {
    return this.statics?.champions[id]?.name ?? fallback;
  }

  /** Looked up by numeric ID: the name in match data does not always match Data Dragon's file name (FiddleSticks). */
  championIcon(id: number): Image.ImageLike {
    const champion = this.statics?.champions[id];
    if (!this.statics || !champion) return Icon.Person;
    return rounded(`${DDRAGON}/cdn/${this.statics.version}/img/champion/${champion.id}.png`, Icon.Person);
  }

  itemName(id: number): string {
    return this.statics?.items[id]?.name ?? `Item ${id}`;
  }

  itemInfo(id: number): { name: string; gold?: number; plaintext: string } {
    const item = this.statics?.items[id];
    return { name: item?.name ?? `Item ${id}`, gold: item?.gold, plaintext: item?.plaintext ?? "" };
  }

  /** Uses the patch the match was played on, so items removed since then still show their icon. */
  itemIcon(id: number, gameVersion?: string): Image.ImageLike {
    if (!this.statics) return Icon.Box;
    const version = versionForPatch(gameVersion, this.statics);
    return rounded(`${DDRAGON}/cdn/${version}/img/item/${id}.png`, Icon.Box);
  }

  spellName(id: number): string {
    return this.statics?.spells[id]?.name ?? `Spell ${id}`;
  }

  spellIcon(id: number): Image.ImageLike {
    const spell = this.statics?.spells[id];
    if (!this.statics || !spell) return Icon.Wand;
    return rounded(`${DDRAGON}/cdn/${this.statics.version}/img/spell/${spell.id}.png`, Icon.Wand);
  }

  profileIcon(id: number): Image.ImageLike {
    if (!this.statics) return Icon.Person;
    return {
      source: `${DDRAGON}/cdn/${this.statics.version}/img/profileicon/${id}.png`,
      mask: Image.Mask.Circle,
      fallback: Icon.Person,
    };
  }

  /**
   * The mini crest, which fills its image. The larger "emblem" PNGs are 1280x720 canvases with the emblem in a
   * fifth of it, so at row-icon size they were a few pixels wide. Emerald has no PNG crest yet, only an SVG.
   */
  tierEmblem(tier: string): Image.ImageLike {
    const name = tier.toLowerCase();
    const file = name === "emerald" ? "emerald.svg" : `${name}.png`;
    return { source: `${CDRAGON}/images/ranked-mini-crests/${file}`, fallback: Icon.Trophy };
  }
}
