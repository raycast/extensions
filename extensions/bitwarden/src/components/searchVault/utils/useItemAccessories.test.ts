/* eslint-disable react-hooks/rules-of-hooks */
import { Color, Icon } from "@raycast/api";
import { ITEM_TYPE_TO_ACCESSORY_MAP, useItemAccessories } from "./useItemAccessories";
import { Folder, Item, ItemType, Reprompt } from "~/types/vault";
import { getMockFolder, getMockItem } from "~/utils/testing/mocks";
import { useFavoritesContext as _useFavoritesContext } from "~/context/favorites";

const useFavoritesContext = _useFavoritesContext as jest.MockedFunction<typeof _useFavoritesContext>;

jest.mock("~/context/favorites", () => ({
  useFavoritesContext: jest.fn(),
}));

type SetupProps = {
  item?: Item | null;
  folder?: Folder | null;
  favoriteOrder?: string[];
};

const setup = ({ item, folder, favoriteOrder = [] }: SetupProps) => {
  useFavoritesContext.mockReturnValue({
    favoriteOrder,
    setFavoriteOrder: jest.fn(),
    moveFavorite: jest.fn(),
    toggleFavorite: jest.fn(),
  });

  const _folder = folder === null ? undefined : folder || getMockFolder();
  return useItemAccessories(item ?? getMockItem(), _folder);
};

describe("useItemAccessories", () => {
  it("returns only the type accessory (only guaranteed)", () => {
    const item = getMockItem({ overrideProps: { favorite: false, reprompt: Reprompt.NO } });
    const result = setup({ item, folder: null, favoriteOrder: [] });

    expect(result).toEqual([ITEM_TYPE_TO_ACCESSORY_MAP[item.type]]);
  });

  it("returns a folder accessory", () => {
    const folder = getMockFolder();
    const result = setup({ folder });

    expect(result).toContainEqual({
      icon: { source: Icon.Folder, tintColor: Color.SecondaryText },
      tag: { value: folder.name, color: Color.SecondaryText },
      tooltip: `${folder.name} Folder`,
    });
  });

  it("returns a bitwarden favorite accessory", () => {
    const item = getMockItem({ overrideProps: { favorite: true } });
    const result = setup({ item });

    expect(result).toContainEqual({
      icon: { source: Icon.Star, tintColor: Color.Blue },
      tooltip: "Bitwarden Favorite",
    });
  });

  it("returns a local favorite accessory", () => {
    const item = getMockItem({ overrideProps: { favorite: false } });
    const result = setup({ item, favoriteOrder: [item.id] });

    expect(result).toContainEqual({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" });
  });

  it("returns a reprompt accessory", () => {
    const item = getMockItem({ overrideProps: { reprompt: Reprompt.REQUIRED } });
    const result = setup({ item });

    expect(result).toContainEqual({
      icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
      tooltip: "Master password re-prompt",
    });
  });

  it("returns a type accessory", () => {
    Object.values(ItemType).forEach((type) => {
      const itemType = type as ItemType;
      const item = getMockItem({ overrideProps: { type: itemType } });
      const result = setup({ item });

      expect(result).toContainEqual(ITEM_TYPE_TO_ACCESSORY_MAP[itemType]);
    });
  });
});
