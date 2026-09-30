import { useMemo, useState } from "react";
import { useFetch } from "@raycast/utils";
import { List } from "@raycast/api";

interface Car {
  kenteken: string;
  merk: string;
  handelsbenaming: string;
  datum_eerste_toelating_dt?: string;
  datum_eerste_tenaamstelling_in_nederland_dt?: string;
  vervaldatum_apk_dt?: string;
  eerste_kleur?: string;
  bruto_bpm?: number;
  catalogusprijs?: number;
  aantal_cilinders?: number;
  cilinderinhoud?: number;
  lengte?: number;
  breedte?: number;
  massa_ledig_voertuig?: number;
  toegestane_maximum_massa_voertuig?: number;
  massa_rijklaar?: number;
  maximum_massa_trekken_ongeremd?: number;
  maximum_trekken_massa_geremd?: number;
  wam_verzekerd?: string;
  tellerstandoordeel?: string;
}

/**
 * Function to convert a date string to a locale date string
 * @param value
 */
const toDate = (value?: string) =>
  value && !isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : "Unknown";

/**
 * Function to convert a number to a centimeter
 * @param value
 */
const toCentimeters = (value?: number) => (value && !isNaN(value) ? `${value.toLocaleString()}cm` : "Unknown");

/**
 * Function to convert a number to a kilogram
 * @param value
 */
const toKilograms = (value?: number) => (value && !isNaN(value) ? `${value.toLocaleString()}kg` : "Unknown");

/**
 * Function to convert a number to a euro currency
 * @param value
 */
const toEuro = (value?: number) =>
  value && !isNaN(value)
    ? new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
      }).format(value)
    : "Unknown";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const keyword = useMemo(() => {
    return searchText.toUpperCase();
  }, [searchText]);

  /**
   * The URL to fetch the data from
   * @type {string}
   */
  const url: string = useMemo(() => {
    // Remove spaces from the keyword for the licence plate
    const licence = keyword.replace(/\s/g, "");

    // Return the URL to fetch the data from
    return (
      `https://opendata.rdw.nl/resource/m9d7-ebf2.json?` +
      `$select=merk,kenteken,handelsbenaming,datum_eerste_toelating_dt,datum_eerste_tenaamstelling_in_nederland_dt,vervaldatum_apk_dt,eerste_kleur,bruto_bpm,catalogusprijs,aantal_cilinders,cilinderinhoud,` +
      `lengte,breedte,massa_ledig_voertuig,toegestane_maximum_massa_voertuig,massa_rijklaar,maximum_massa_trekken_ongeremd,maximum_trekken_massa_geremd,` +
      `wam_verzekerd,tellerstandoordeel` +
      `&$where=kenteken LIKE '${licence}%25' or merk LIKE '%25${keyword}%25' or handelsbenaming LIKE '%25${keyword}%25'` +
      `&$limit=25`
    );
  }, [keyword]);

  const { isLoading, data } = useFetch<Car[]>(url, {
    // to make sure the screen isn't flickering when the searchText changes
    keepPreviousData: true,
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={true}
      searchBarPlaceholder="Search on license plate, brand or type"
      throttle
    >
      <List.Section title="Found licenses:">
        {(data || []).map((item: Car) => (
          <List.Item
            key={item.kenteken}
            title={item.kenteken}
            subtitle={`${item.handelsbenaming}`}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="License plate" text={item.kenteken} />
                    <List.Item.Detail.Metadata.Label title="Brand" text={item.merk} />
                    <List.Item.Detail.Metadata.Label title="Trade name" text={item.handelsbenaming} />
                    <List.Item.Detail.Metadata.Label title="Color" text={item.eerste_kleur ?? "Unknown"} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Number of cylinders"
                      text={item.aantal_cilinders?.toString() ?? "Unknown"}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Cylinder capacity"
                      text={toCentimeters(item.cilinderinhoud)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Length" text={toCentimeters(item.lengte)} />
                    <List.Item.Detail.Metadata.Label title="Width" text={toCentimeters(item.breedte)} />
                    <List.Item.Detail.Metadata.Label
                      title="Empty vehicle mass"
                      text={toKilograms(item.massa_ledig_voertuig)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Unbraked towing mass"
                      text={toKilograms(item.maximum_massa_trekken_ongeremd)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Braked towing mass"
                      text={toKilograms(item.maximum_trekken_massa_geremd)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="First admission"
                      text={toDate(item.datum_eerste_toelating_dt)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="First registration in the Netherlands"
                      text={toDate(item.datum_eerste_tenaamstelling_in_nederland_dt)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="APK expiration date"
                      text={toDate(item.vervaldatum_apk_dt)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Catalog price" text={toEuro(item.catalogusprijs)} />
                    <List.Item.Detail.Metadata.Label title="Gross BPM" text={toEuro(item.bruto_bpm)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            accessories={[
              {
                tag: item.merk,
                tooltip: "Brand",
              },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}
