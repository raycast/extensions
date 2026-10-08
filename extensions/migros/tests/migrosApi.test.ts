import fs from "fs";
import nock from "nock";
import path from "path";
import client from "../src/lib/api/migrosApi";

const FIXTURE_DIR = path.resolve(__dirname, "__nockFixtures__");
const FIXTURE_FILE = path.join(FIXTURE_DIR, "migros-integration-nock.json");
const SHOULD_RECORD = !!process.env.NOCK_RECORD;

describe("migrosApi", () => {
  jest.setTimeout(30000);

  describe("integration tests (recorded)", () => {
    let token: string;

    beforeAll(() => {
      if (!fs.existsSync(FIXTURE_DIR)) {
        fs.mkdirSync(FIXTURE_DIR, { recursive: true });
      }

      if (SHOULD_RECORD) {
        nock.recorder.clear();
        nock.recorder.rec({ dont_print: true, output_objects: true });
      } else {
        if (!fs.existsSync(FIXTURE_FILE)) {
          throw new Error("No nock fixture found; run with NOCK_RECORD=1 to record");
        }
        const fixtures = JSON.parse(fs.readFileSync(FIXTURE_FILE, "utf8"));
        fixtures.forEach((f: nock.Definition) => nock.define([f]));
      }
    });

    afterAll(() => {
      if (SHOULD_RECORD) {
        const calls = nock.recorder.play() as nock.Definition[];
        fs.writeFileSync(FIXTURE_FILE, JSON.stringify(calls, null, 2));
        nock.recorder.clear();
        console.log("Recorded nock fixtures to", FIXTURE_FILE);
      }
    });

    describe("authentication", () => {
      test("getGuestToken returns a valid token", async () => {
        const guest = await client.getGuestToken();
        expect(guest).toBeDefined();
        expect(guest.token).toBeTruthy();
        token = guest.token;
      });
    });

    describe("cooperative lookup", () => {
      test("getCooperativeByZipCode returns cooperative for Zürich (8004)", async () => {
        const cooperative = await client.getCooperativeByZipCode("8004", token);
        expect(cooperative).toBeDefined();
        expect(cooperative?.cooperative).toBeDefined();
        expect(cooperative?.zipCode).toBe("8004");
        expect(cooperative?.cityName).toBeDefined();
      });
    });

    describe("product search", () => {
      let productId: string | number | null = null;

      test("searchProduct returns results for 'sashimi'", async () => {
        const search = await client.searchProduct("sashimi", token);
        expect(search).toBeDefined();
        expect(search.productIds).toBeDefined();
        expect(search.productIds!.length).toBeGreaterThan(0);
        productId = search.productIds![0];
      });

      test("getProductCards returns product details", async () => {
        expect(productId).toBeTruthy();
        const cards = await client.getProductCards({ productFilter: { uids: [productId!] } }, token);
        expect(Array.isArray(cards)).toBe(true);
        expect(cards.length).toBeGreaterThan(0);
        expect(cards[0].name).toBeDefined();

        // Save the raw response for type generation/change detection
        const respPath = path.join(FIXTURE_DIR, "api-response-productCards.json");
        fs.writeFileSync(respPath, JSON.stringify(cards, null, 2));
      });
    });

    describe("store search and availability", () => {
      let stores: Array<{ costCenterId?: string; id?: string }> = [];
      let productId: string | number | null = null;

      test("searchStoresByQuery returns stores for zip code 8004", async () => {
        stores = await client.searchStoresByQuery("8004", token);
        expect(stores).toBeDefined();
        expect(Array.isArray(stores)).toBe(true);
        expect(stores.length).toBeGreaterThan(0);
      });

      test("getProductSupply returns availability for a product", async () => {
        // Get a product ID first
        const search = await client.searchProduct("sashimi", token);
        productId = search.productIds?.[0] || null;
        expect(productId).toBeTruthy();

        const costCenterIds = stores.map((s) => s.costCenterId || s.id).filter(Boolean) as string[];
        expect(costCenterIds.length).toBeGreaterThan(0);

        const supply = await client.getProductSupply(String(productId), costCenterIds, token);
        expect(supply).toBeDefined();
        expect(supply.availabilities).toBeDefined();
      });
    });

    describe("promotions", () => {
      test("getPromotions returns promotions with details", async () => {
        const promos = await client.getPromotions(token, "en", "national");
        expect(promos).toBeDefined();
        expect(promos.promotionsProductIds).toBeDefined();
        expect(Array.isArray(promos.promotionsProductIds)).toBe(true);
        expect(promos.promotionDetails).toBeDefined();
        expect(Array.isArray(promos.promotionDetails)).toBe(true);

        // Check structure of promotion details if any exist
        if (promos.promotionDetails.length > 0) {
          const promo = promos.promotionDetails[0];
          expect(promo.id).toBeDefined();
          expect(promo.description).toBeDefined();
          expect(promo.productIds).toBeDefined();
          expect(Array.isArray(promo.productIds)).toBe(true);
        }
      });
    });

    describe("fulfillment selection", () => {
      test("getFulfillmentSelection returns fulfillment data for Basel (4001)", async () => {
        const fulfillment = await client.getFulfillmentSelection("4001", token);
        expect(fulfillment).toBeDefined();
        expect(fulfillment.warehouseId).toBeDefined();
        expect(typeof fulfillment.warehouseId).toBe("number");
        expect(fulfillment.cooperative).toBeDefined();
        expect(fulfillment.inStoreZipCode).toBe("4001");
        expect(fulfillment.inStoreCityName).toBeDefined();
      });

      test("getFulfillmentSelection returns fulfillment data for Zürich (8004)", async () => {
        const fulfillment = await client.getFulfillmentSelection("8004", token);
        expect(fulfillment).toBeDefined();
        expect(fulfillment.warehouseId).toBeDefined();
        expect(fulfillment.cooperative).toBeDefined();
        expect(fulfillment.inStoreZipCode).toBe("8004");
      });
    });

    describe("product detail", () => {
      let fulfillment: { warehouseId: number; cooperative: string };

      test("getProductDetail returns detailed product information", async () => {
        // First get fulfillment data for the region
        fulfillment = await client.getFulfillmentSelection("8004", token);

        const details = await client.getProductDetail(
          {
            productFilter: { migrosIds: ["104241300000"] },
            offerFilter: {
              warehouseId: fulfillment.warehouseId,
              region: fulfillment.cooperative,
            },
          },
          token,
        );

        expect(Array.isArray(details)).toBe(true);
        expect(details.length).toBeGreaterThan(0);

        const product = details[0];
        expect(product.migrosId).toBe("104241300000");
        expect(product.name).toBeDefined();
        expect(product.productInformation).toBeDefined();

        // Save the raw response for type generation/change detection
        const respPath = path.join(FIXTURE_DIR, "api-response-productDetail.json");
        fs.writeFileSync(respPath, JSON.stringify(details, null, 2));
      });

      test("getProductDetail includes nutrition and ingredient information", async () => {
        const details = await client.getProductDetail(
          {
            productFilter: { migrosIds: ["104241300000"] },
            offerFilter: {
              warehouseId: fulfillment.warehouseId,
              region: fulfillment.cooperative,
            },
          },
          token,
        );

        const product = details[0];
        expect(product.productInformation?.mainInformation).toBeDefined();

        // Check for ingredients if available
        if (product.productInformation?.mainInformation?.ingredients) {
          expect(typeof product.productInformation.mainInformation.ingredients).toBe("string");
        }

        // Check for nutrients if available
        if (product.productInformation?.nutrientsInformation?.nutrientsTable) {
          expect(product.productInformation.nutrientsInformation.nutrientsTable.headers).toBeDefined();
          expect(product.productInformation.nutrientsInformation.nutrientsTable.rows).toBeDefined();
        }
      });
    });
  });

  // Skip edge case tests during recording - they use inline mocks, not real API
  const describeEdgeCases = SHOULD_RECORD ? describe.skip : describe;

  describeEdgeCases("edge cases (mocked)", () => {
    afterEach(() => {
      nock.cleanAll();
    });

    test("getCooperativeByZipCode returns null for unknown zip code", async () => {
      nock("https://www.migros.ch")
        .get("/fulfilment-selector/public/cooperatives")
        .query({ zipOrCity: "99999", uniqueMatch: false })
        .reply(200, []);

      const coop = await client.getCooperativeByZipCode("99999");
      expect(coop).toBeNull();
    });

    test("getCooperativeByZipCode returns first cooperative when multiple matches", async () => {
      nock("https://www.migros.ch")
        .get("/fulfilment-selector/public/cooperatives")
        .query({ zipOrCity: "800", uniqueMatch: false })
        .reply(200, [
          { cooperative: "gmzh", zipCode: "8000", cityName: "Zürich" },
          { cooperative: "gmzh", zipCode: "8001", cityName: "Zürich" },
        ]);

      const coop = await client.getCooperativeByZipCode("800");
      expect(coop).not.toBeNull();
      expect(coop!.cooperative).toBe("gmzh");
      expect(coop!.zipCode).toBe("8000");
    });

    test("searchProduct returns empty productIds for no results", async () => {
      nock("https://www.migros.ch")
        .get("/authentication/public/v1/api/guest")
        .query({ authorizationNotRequired: true })
        .reply(200, {}, { leshopch: "test-token" });

      nock("https://www.migros.ch").post("/onesearch-oc-seaapi/public/v5/search").reply(200, { productIds: [] });

      const guest = await client.getGuestToken();
      const search = await client.searchProduct("xyznonexistent123", guest.token);
      expect(search.productIds).toEqual([]);
    });

    test("getProductCards returns empty array for no products", async () => {
      nock("https://www.migros.ch").post("/product-display/public/v4/product-cards").reply(200, []);

      const cards = await client.getProductCards({ productFilter: { uids: [] } });
      expect(cards).toEqual([]);
    });

    test("getPromotions returns empty promotions", async () => {
      nock("https://www.migros.ch")
        .get("/product-display/public/v1/promotions/personalized")
        .query({ region: "national", language: "de" })
        .reply(200, { promotionsProductIds: [], promotionDetails: [] });

      const promos = await client.getPromotions(undefined, "de", "national");
      expect(promos.promotionsProductIds).toEqual([]);
      expect(promos.promotionDetails).toEqual([]);
    });

    test("getPromotions parses promotion details correctly", async () => {
      const mockPromos = {
        promotionsProductIds: [{ id: "123", productId: [100001, 100002] }],
        promotionDetails: [
          {
            id: "123",
            description: "Test Promotion",
            discountHint: "33% off",
            badges: [{ type: "PERCENTAGE_PROMOTION", description: "33%" }],
            categories: [{ id: "7494743", name: "Test Category", slugs: ["test"] }],
            productIds: [100001, 100002],
            startDate: "2026-01-13",
            endDate: "2026-01-19",
          },
        ],
      };

      nock("https://www.migros.ch")
        .get("/product-display/public/v1/promotions/personalized")
        .query({ region: "national", language: "en" })
        .reply(200, mockPromos);

      const promos = await client.getPromotions(undefined, "en", "national");
      expect(promos.promotionDetails.length).toBe(1);
      expect(promos.promotionDetails[0].description).toBe("Test Promotion");
      expect(promos.promotionDetails[0].badges?.[0].description).toBe("33%");
      expect(promos.promotionDetails[0].startDate).toBe("2026-01-13");
    });

    test("getFulfillmentSelection returns fulfillment data", async () => {
      const mockFulfillment = {
        cooperative: "gmbs",
        warehouseId: 7,
        inStoreZipCode: "4001",
        inStoreCityName: "Basel",
        eComZipCode: "4001",
        eComCityName: "Basel",
        isLocationGuessed: false,
        allowSpecialFresh: true,
      };

      nock("https://www.migros.ch")
        .get("/fulfilment-selector/public/v1/fulfilment-selection")
        .query({ zipCode: "4001" })
        .reply(200, mockFulfillment);

      const fulfillment = await client.getFulfillmentSelection("4001");
      expect(fulfillment.cooperative).toBe("gmbs");
      expect(fulfillment.warehouseId).toBe(7);
      expect(fulfillment.inStoreZipCode).toBe("4001");
      expect(fulfillment.inStoreCityName).toBe("Basel");
    });

    test("getProductDetail returns empty array for unknown migrosId", async () => {
      nock("https://www.migros.ch").post("/product-display/public/v3/product-detail").reply(200, []);

      const details = await client.getProductDetail({
        productFilter: { migrosIds: ["999999999999"] },
      });
      expect(details).toEqual([]);
    });

    test("getProductDetail parses product information correctly", async () => {
      const mockProduct = [
        {
          uid: 100003016,
          migrosId: "104242200000",
          name: "Getreideriegel",
          brand: "Farmer",
          productInformation: {
            mainInformation: {
              brand: { name: "Farmer", slug: "farmer" },
              ingredients: "Getreide 43% (Hafer, Weizen), Honig 19%",
              allergens: "Milch, Haselnüsse, Glutenhaltiges Getreide",
              rating: { nbReviews: 392, nbStars: 4.5 },
            },
            nutrientsInformation: {
              nutrientsTable: {
                headers: ["100 g", "1 Riegel (20 g)"],
                rows: [
                  { label: "Energie", values: ["2040 kJ (487 kcal)", "405 kJ (97 kcal)", "5 %"] },
                  { label: "Fett", values: ["22 g", "4.4 g", "6 %"], fsaLevel: "HIGH" },
                ],
              },
              portionSentence: "1 Packung = 12 Portionen",
            },
            usageInformation: {
              usage: "Geeignet als Snack oder Zwischenverpflegung",
            },
            otherInformation: {
              articleNumber: "104242200000",
              legalDesignation: "Getreideriegel mit Honig",
            },
          },
          offer: {
            price: { advertisedDisplayValue: "3.95", effectiveValue: 3.95 },
            promotionPrice: { advertisedDisplayValue: "2.65", effectiveValue: 2.65 },
            badges: [{ type: "PERCENTAGE_PROMOTION", description: "33%" }],
          },
        },
      ];

      nock("https://www.migros.ch").post("/product-display/public/v3/product-detail").reply(200, mockProduct);

      const details = await client.getProductDetail({
        productFilter: { migrosIds: ["104242200000"] },
        offerFilter: { warehouseId: 2, region: "gmzh" },
      });

      expect(details.length).toBe(1);
      expect(details[0].name).toBe("Getreideriegel");
      expect(details[0].brand).toBe("Farmer");
      expect(details[0].productInformation?.mainInformation?.ingredients).toContain("Getreide");
      expect(details[0].productInformation?.mainInformation?.rating?.nbStars).toBe(4.5);
      expect(details[0].productInformation?.nutrientsInformation?.nutrientsTable?.rows.length).toBe(2);
      expect(details[0].productInformation?.usageInformation?.usage).toContain("Snack");
    });
  });
});
