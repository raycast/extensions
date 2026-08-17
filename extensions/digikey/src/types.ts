interface Pricing {
  BreakQuantity: number;
  UnitPrice: number;
  TotalPrice: number;
}
interface ProductVariation {
  DigiKeyProductNumber: string;
  PackageType: {
    Id: number;
    Name: string;
  };
  StandardPricing: Pricing[];
  MyPricing: Pricing[];
  MarketPlace: boolean;
  TariffActive: boolean;
  Supplier: {
    Id: number;
    Name: string;
  };
  QuantityAvailableforPackageType: number;
  MaxQuantityForDistribution: number;
  MinimumOrderQuantity: number;
  StandardPackage: number;
  DigiReelFee: number;
}
export interface ProductResult {
  Product: {
    Description: {
      ProductDescription: string;
      DetailedDescription: string;
    };
    Manufacturer: {
      Id: number;
      Name: string;
    };
    ManufacturerProductNumber: string;
    UnitPrice: number;
    ProductUrl: string | null;
    DatasheetUrl: string | null;
    PhotoUrl: string | null;
    ProductVariations: ProductVariation[];
    QuantityAvailable: number;
    ProductStatus: {
      Id: number;
      Status: string;
    };
    BackOrderNotAllowed: boolean | null;
    NormallyStocking: boolean | null;
    Discontinued: boolean | null;
    EndOfLife: boolean | null;
    Ncnr: boolean | null;
    PrimaryVideoUrl: string | null;
    Parameters: Array<{
      ParameterId: number;
      ParameterText: string;
      ParameterType: string;
      ValueId: string;
      ValueText: string;
    }>;
    BaseProductNumber: {
      Id: number;
      Name: string;
    } | null;
    Category: {
      CategoryId: number;
      ParentId: number;
      Name: string;
      ProductCount: number;
      NewProductCount: number;
      ImageUrl: string;
      SeoDescription: string;
      // "ChildCategories": [
      //   null
      // ]
    };
    DateLastBuyChance: string;
    ManufacturerLeadWeeks: string;
    ManufacturerPublicQuantity: number;
    Series: {
      Id: number;
      Name: string;
    };
    ShippingInfo: string | null;
    Classifications: {
      ReachStatus: string;
      RohsStatus: string;
      MoistureSensitivityLevel: string;
      ExportControlClassNumber: string;
      HtsusCode: string;
    } | null;
    OtherNames: string[] | null;
  };
}

export interface ErrorResult {
  title: string;
  status: number;
  detail: string;
}
