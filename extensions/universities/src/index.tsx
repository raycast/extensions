import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { useState } from "react";
import { GeoPos, University } from "./types";

const UNIV_API = "http://universities.hipolabs.com/search?name=";
const GEOP_API = "https://geocode.maps.co/search?q=";
const MAPS_API = "https://maps.geoapify.com/v1/staticmap?";

const { apiKey } = getPreferenceValues();

export default function Command() {
  const [showingDetail, setShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { isLoading, data } = useFetch<University[]>(`${UNIV_API}${searchText}`, {
    keepPreviousData: true,
    execute: searchText.length > 0,
  });

  const countries: string[] = [];
  (data || [])
    .sort((a, b) => a.country.localeCompare(b.country))
    .map((item) => {
      if (countries.indexOf(item.country.trim()) == -1) countries.push(item.country.trim());
    });

  const results = uniqUniversities(data || []);

  if (searchText.length == 0) {
    return (
      <List searchText={searchText} onSearchTextChange={setSearchText} throttle={true}>
        <List.EmptyView
          icon={{ source: { light: "graduationcap.fill_black.png", dark: "graduationcap.fill_white.png" } }}
          title={"Empty Search"}
          description="Please enter a search term."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText || ""}
      onSearchTextChange={setSearchText}
      throttle={true}
      isShowingDetail={showingDetail}
    >
      {countries.map((country) => (
        <List.Section key={country} title={country}>
          {(results || [])
            .filter((univ) => univ.country == country)
            .map((item) => {
              const others: Partial<List.Item.Props> = showingDetail
                ? {
                    detail: <UniversityDetails univ={item} />,
                  }
                : { accessories: [{ text: item.web_pages[0] }] };
              return (
                <List.Item
                  key={item.name}
                  title={item.name}
                  icon={
                    item.web_pages.length > 0 ? getFavicon(correctURL(item.web_pages[0]), { fallback: "🎓" }) : "🎓"
                  }
                  {...others}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open Website" url={correctURL(item.web_pages[0])} />
                      <Action
                        title="Toggle Details"
                        icon={Icon.AppWindowSidebarLeft}
                        onAction={() => setShowingDetail(!showingDetail)}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
      <List.EmptyView
        icon={{ source: { light: "graduationcap.fill_black.png", dark: "graduationcap.fill_white.png" } }}
        title={isLoading ? "Searching" : "No results"}
        description={isLoading ? "Please wait..." : "Try another search term."}
      />
    </List>
  );
}

function uniqUniversities(array: University[]): University[] {
  const result: University[] = [];
  for (const item of array) {
    const found = result.some((value) => value.name === item.name);
    if (!found) {
      result.push(item);
    }
  }
  return result;
}

function correctURL(url: string): string {
  return url.startsWith("http") ? url : "http://" + url;
}

function UniversityDetails(props: { univ: University }) {
  const { data } = useFetch<GeoPos[]>(`${GEOP_API}${encodeURI(props.univ.name + ", " + props.univ.country)}`);
  let img_str = "";

  if (data && data.length > 0) {
    const APIKEY = `apiKey=${apiKey}`;
    const LON = data[0].lon;
    const LAT = data[0].lat;
    const MAPSTYLE = "&style=osm-bright";
    const SIZE = "&scaleFactor=2&zoom=12.5&width=600&height=300";
    const MARKER = `&marker=lonlat:${LON},${LAT};type:material;color:%23ffbd03;size:large;icon:graduation-cap;icontype:awesome`;
    const static_map_url = `${MAPS_API}${APIKEY}${MAPSTYLE}${SIZE}${MARKER}`;

    img_str = `![map](${static_map_url})`;
  }
  return (
    <List.Item.Detail
      markdown={`# ${props.univ.name}\n ${img_str}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Country" text={props.univ.country} />
          <List.Item.Detail.Metadata.Link
            title={props.univ.web_pages.length > 1 ? "Websites" : "Website"}
            target={correctURL(props.univ.web_pages[0])}
            text={props.univ.web_pages[0]}
          />
          {props.univ.web_pages.slice(1).map((url) => {
            return (
              <List.Item.Detail.Metadata.Link
                title=""
                target={url.startsWith("http") ? url : "http://" + url}
                text={url}
              />
            );
          })}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
