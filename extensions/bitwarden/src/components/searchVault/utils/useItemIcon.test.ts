/* eslint-disable react-hooks/rules-of-hooks */
import { CARD_BRANDS, Item, ItemType } from "~/types/vault";
import { getMockItem } from "~/utils/testing/mocks";
import { useItemIcon } from "~/components/searchVault/utils/useItemIcon";
import { Icon } from "@raycast/api";
import { faviconUrl } from "~/utils/search";
import { getCardImageUrl } from "~/utils/cards";

jest.mock("~/context/favorites", () => ({
  useFavoritesContext: jest.fn(),
}));

type SetupProps = {
  item?: Item | null;
};

const setup = ({ item }: SetupProps) => {
  return useItemIcon(item ?? getMockItem());
};

describe("useItemIcon", () => {
  it("returns default icon as a fallback", () => {
    const item = getMockItem({ itemType: "NonExistent" as any });
    const result = setup({ item });

    expect(result).toEqual(Icon.QuestionMark);
  });

  it("returns favicon url for login item", () => {
    const item = getMockItem({ itemType: ItemType.LOGIN });
    const result = setup({ item });

    expect(result).toEqual(faviconUrl(item.login?.uris?.[0]?.uri as any));
  });

  it("returns card type image url for card item", () => {
    Object.values(CARD_BRANDS).forEach((brand) => {
      const item = getMockItem({
        itemType: ItemType.CARD,
        overrideProps: {
          card: {
            brand,
            cardholderName: null,
            expMonth: null,
            expYear: null,
            number: null,
            code: null,
          },
        },
      });
      const result = setup({ item });

      if (brand !== CARD_BRANDS.OTHER) {
        expect(result).toEqual(getCardImageUrl(brand));
      }
    });
  });

  it("returns the corresponding icon for card item", () => {
    const item = getMockItem({
      itemType: ItemType.CARD,
      overrideProps: {
        card: {
          brand: null,
          cardholderName: null,
          expMonth: null,
          expYear: null,
          number: null,
          code: null,
        },
      },
    });
    const result = setup({ item });

    expect(result).toEqual(Icon.CreditCard);
  });

  it("returns the corresponding icon for identity item", () => {
    const item = getMockItem({ itemType: ItemType.IDENTITY });
    const result = setup({ item });

    expect(result).toEqual(Icon.Person);
  });

  it("returns the corresponding icon for note item", () => {
    const item = getMockItem({ itemType: ItemType.NOTE });
    const result = setup({ item });

    expect(result).toEqual(Icon.Document);
  });
});
