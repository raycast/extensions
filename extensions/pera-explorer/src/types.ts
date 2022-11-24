export const verificationTierType = ["trusted", "verified", "unverified", "suspicious"] as const;

type ASAMediaType = "image" | "video" | "mixed" | "unknown";

interface CollectibleModel {
  standard: "arc3" | "arc69";
  media_type: ASAMediaType;
  primary_image: string;
  title: string;
  explorer_url: string;
  media: {
    type: ASAMediaType;
    download_url: string;
    preview_url?: string;
    extension: string;
  }[];
  description: string;
}

export interface AssetModel {
  asset_id: number;
  name: string;
  logo: string;
  unit_name: string;
  fraction_decimals: number | null;
  total: string;
  usd_value: string | null;
  is_verified: boolean;
  verification_tier: typeof verificationTierType[number];
  collectible: CollectibleModel;
  creator: {
    id: number;
    address: string;
    is_verified_asset_creator: boolean;
  };
}

export interface AssetDetailModel extends AssetModel {
  project_url: string;
  project_name: string;
  logo_svg: string;
  discord_url: string;
  telegram_url: string;
  twitter_username: string;
  description: string;
  url: string;
  total_supply: number;
}
