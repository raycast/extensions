import { withAccessToken } from "@raycast/utils";
import { useState } from "react";
import { hasSchwabCredentials, schwabOAuth } from "../lib/oauth";
import { useInstrumentSearch } from "../hooks/useInstrumentSearch";
import { TickerSearchResults } from "../components/TickerSearchResults";
import { Onboarding } from "../components/Onboarding";

function TickerLookup() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading } = useInstrumentSearch(searchText);

  return (
    <TickerSearchResults
      results={data?.instruments ?? []}
      isLoading={isLoading}
      searchText={searchText}
      onSearchChange={setSearchText}
    />
  );
}

const Authed = withAccessToken(schwabOAuth)(TickerLookup);

export default function Command() {
  return hasSchwabCredentials() ? <Authed /> : <Onboarding />;
}
