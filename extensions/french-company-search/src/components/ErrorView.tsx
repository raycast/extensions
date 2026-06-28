import { Detail } from "@raycast/api";

interface ErrorViewProps {
  siren: string;
  hasNoData: boolean;
}

export function ErrorView({ siren, hasNoData }: ErrorViewProps) {
  if (hasNoData) {
    return (
      <Detail
        markdown={`## ❌ No data found\n\nThe INPI API did not return data for SIREN ${siren}.\n\n### What to do?\n\n- ✅ **Check the SIREN number**: Make sure it contains exactly 9 digits\n- ✅ **Check that the company exists**: Consult the [company directory](https://www.societe.com)\n- ✅ **Wait a few minutes**: Recent data may take time to appear\n- ✅ **Contact INPI support**: If the company exists but does not appear\n\n### Technical information\n- SIREN searched: **${siren}**\n- Source: API INPI\n- Status: No personneMorale/personnePhysique data`}
      />
    );
  }

  return null;
}
