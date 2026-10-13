export const CUSTOM_REGION_VALUE = "__custom__";

// All AWS regions, per https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-instance-regions.html
// (commercial, China, GovCloud, and the European Sovereign Cloud partitions). Not exhaustive
// forever - AWS adds new regions over time, which is why the region field always also accepts
// freeform custom input.
export const AWS_REGIONS: { value: string; title: string }[] = [
  { value: "us-east-1", title: "US East (N. Virginia)" },
  { value: "us-east-2", title: "US East (Ohio)" },
  { value: "us-west-1", title: "US West (N. California)" },
  { value: "us-west-2", title: "US West (Oregon)" },
  { value: "ca-central-1", title: "Canada (Central)" },
  { value: "ca-west-1", title: "Canada West (Calgary)" },
  { value: "mx-central-1", title: "Mexico (Central)" },
  { value: "sa-east-1", title: "South America (São Paulo)" },
  { value: "eu-west-1", title: "Europe (Ireland)" },
  { value: "eu-west-2", title: "Europe (London)" },
  { value: "eu-west-3", title: "Europe (Paris)" },
  { value: "eu-central-1", title: "Europe (Frankfurt)" },
  { value: "eu-central-2", title: "Europe (Zurich)" },
  { value: "eu-north-1", title: "Europe (Stockholm)" },
  { value: "eu-south-1", title: "Europe (Milan)" },
  { value: "eu-south-2", title: "Europe (Spain)" },
  { value: "me-south-1", title: "Middle East (Bahrain)" },
  { value: "me-central-1", title: "Middle East (UAE)" },
  { value: "il-central-1", title: "Israel (Tel Aviv)" },
  { value: "af-south-1", title: "Africa (Cape Town)" },
  { value: "ap-east-1", title: "Asia Pacific (Hong Kong)" },
  { value: "ap-east-2", title: "Asia Pacific (Taipei)" },
  { value: "ap-south-1", title: "Asia Pacific (Mumbai)" },
  { value: "ap-south-2", title: "Asia Pacific (Hyderabad)" },
  { value: "ap-southeast-1", title: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", title: "Asia Pacific (Sydney)" },
  { value: "ap-southeast-3", title: "Asia Pacific (Jakarta)" },
  { value: "ap-southeast-4", title: "Asia Pacific (Melbourne)" },
  { value: "ap-southeast-5", title: "Asia Pacific (Malaysia)" },
  { value: "ap-southeast-6", title: "Asia Pacific (New Zealand)" },
  { value: "ap-southeast-7", title: "Asia Pacific (Thailand)" },
  { value: "ap-northeast-1", title: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", title: "Asia Pacific (Seoul)" },
  { value: "ap-northeast-3", title: "Asia Pacific (Osaka)" },
  { value: "cn-north-1", title: "China (Beijing)" },
  { value: "cn-northwest-1", title: "China (Ningxia)" },
  { value: "us-gov-east-1", title: "AWS GovCloud (US-East)" },
  { value: "us-gov-west-1", title: "AWS GovCloud (US-West)" },
  { value: "eusc-de-east-1", title: "AWS European Sovereign Cloud (Germany)" },
];

/** Splits a stored region string into dropdown state: a known preset, or Custom + the raw value. */
export function splitRegionForPreset(region: string): {
  preset: string;
  custom: string;
} {
  const isKnown = AWS_REGIONS.some((r) => r.value === region);
  return isKnown
    ? { preset: region, custom: "" }
    : { preset: CUSTOM_REGION_VALUE, custom: region };
}

export function resolveRegion(
  preset: string,
  custom: string,
  fallback: string,
): string {
  const value = preset === CUSTOM_REGION_VALUE ? custom.trim() : preset;
  return value || fallback;
}
