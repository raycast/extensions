import { Detail, LaunchProps } from "@raycast/api";
import { findAreaCode, AreaCodeEntry } from "./data/areaCodes";
import { findCountryCode, CountryCodeEntry } from "./data/countryCodes";
import { formatTimeInZone } from "./utils/timezone";

type LookupResult =
  | { type: "area"; data: AreaCodeEntry }
  | { type: "country"; data: CountryCodeEntry }
  | null;

function detectAndLookup(input: string): LookupResult {
  // Clean the input - keep + for detection, then strip for lookup
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const cleaned = trimmed.replace(/[^0-9]/g, "");

  if (!cleaned) return null;

  // If starts with +, it's definitely a country code
  if (hasPlus) {
    const countryResult = findCountryCode(cleaned);
    if (countryResult) return { type: "country", data: countryResult };
    return null;
  }

  // If exactly 3 digits, try area code first (priority for user's main use case)
  if (cleaned.length === 3) {
    const areaResult = findAreaCode(cleaned);
    if (areaResult) return { type: "area", data: areaResult };

    // Fallback to country code if no area code match
    const countryResult = findCountryCode(cleaned);
    if (countryResult) return { type: "country", data: countryResult };
  }

  // For 1-2 digit inputs, only try country code
  if (cleaned.length >= 1 && cleaned.length <= 3) {
    const countryResult = findCountryCode(cleaned);
    if (countryResult) return { type: "country", data: countryResult };
  }

  return null;
}

function renderAreaCodeResult(result: AreaCodeEntry) {
  const flag = result.country === "US" ? "🇺🇸" : "🇨🇦";
  const countryName = result.country === "US" ? "United States" : "Canada";
  const currentTime = formatTimeInZone(result.timezone);

  const markdown = `# ${flag} ${result.state}

## ${currentTime}

Area code **${result.code}** is located in **${result.state}** (${result.abbreviation}), ${countryName}.`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Area Code" text={result.code} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="State/Province" text={result.state} />
          <Detail.Metadata.Label
            title="Abbreviation"
            text={result.abbreviation}
          />
          <Detail.Metadata.Label
            title="Country"
            text={`${flag} ${countryName}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Timezone"
            text={result.timezone.replace("America/", "").replace(/_/g, " ")}
          />
          <Detail.Metadata.Label title="Current Time" text={currentTime} />
        </Detail.Metadata>
      }
    />
  );
}

function renderCountryCodeResult(result: CountryCodeEntry) {
  const currentTime = formatTimeInZone(result.timezone);

  const markdown = `# ${result.flag} ${result.country}

## ${currentTime}

Country code **+${result.code}**`;

  // Format timezone for display
  const tzDisplay = result.timezone
    .replace("America/", "")
    .replace("Europe/", "")
    .replace("Asia/", "")
    .replace("Africa/", "")
    .replace("Pacific/", "")
    .replace("Indian/", "")
    .replace("Atlantic/", "")
    .replace("Australia/", "")
    .replace(/_/g, " ");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Country Code"
            text={`+${result.code}`}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Country" text={result.country} />
          <Detail.Metadata.Label title="ISO Code" text={result.iso} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Timezone" text={tzDisplay} />
          <Detail.Metadata.Label title="Current Time" text={currentTime} />
        </Detail.Metadata>
      }
    />
  );
}

export default function LookupAreaCode(
  props: LaunchProps<{ arguments: { areaCode: string } }>,
) {
  const { areaCode } = props.arguments;
  const result = detectAndLookup(areaCode);

  if (!result) {
    return (
      <Detail
        markdown={`# Code Not Found

**"${areaCode}"** was not found in our database.

## What you can search:

### Area Codes (US/Canada)
- Enter 3 digits: **212** (New York), **416** (Ontario), **310** (California)

### Country Codes
- Enter 1-3 digits: **44** (UK), **81** (Japan), **91** (India)
- Or use + prefix: **+44**, **+81**, **+91**`}
      />
    );
  }

  if (result.type === "area") {
    return renderAreaCodeResult(result.data);
  }

  return renderCountryCodeResult(result.data);
}
