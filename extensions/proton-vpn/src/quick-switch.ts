import { closeMainWindow, LaunchProps } from "@raycast/api";
import { runWithToast, showFailure } from "./feedback";
import { connectToCountry } from "./protonapp";
import { addRecentCountry } from "./recents";
import { CountryInfo, listCountries } from "./servers";

function resolveCountry(
  query: string,
  countries: CountryInfo[],
): CountryInfo | undefined {
  const q = query.trim().toLowerCase();
  if (!q) return undefined;
  return (
    countries.find((c) => c.code.toLowerCase() === q) ??
    countries.find((c) => c.name.toLowerCase() === q) ??
    countries.find((c) => c.name.toLowerCase().startsWith(q)) ??
    countries.find((c) => c.name.toLowerCase().includes(q))
  );
}

export default async function command(
  props: LaunchProps<{ arguments: Arguments.QuickSwitch }>,
) {
  const query = (props.arguments.country ?? "").trim();
  await closeMainWindow();

  let country: CountryInfo | undefined;
  if (query) {
    const countries = await listCountries().catch(() => []);
    country = resolveCountry(query, countries);
    if (!country) {
      await showFailure(
        "No country found",
        `No country matches "${query}". Use a country name or a two-letter code.`,
      );
      return;
    }
  }

  const label = country ? `${country.flag} ${country.name}` : "fastest server";
  await runWithToast(`Connecting to ${label}…`, async () => {
    const result = await connectToCountry(country?.code);
    if (country) await addRecentCountry(country.code);
    const server = result.server;
    return {
      title: `Connected to ${label}`,
      message: server?.name
        ? `${server.name}${server.city ? ", " + server.city : ""}`
        : undefined,
    };
  });
}
