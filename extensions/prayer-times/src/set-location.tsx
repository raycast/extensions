import { Action, ActionPanel, Form, Icon, launchCommand, LaunchType, popToRoot, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { listCountries } from "./lib/countries";
import {
  CityResult,
  cityLabel,
  distanceKm,
  loadCities,
  locationFromFix,
  readLocation,
  StoredLocation,
  writeLocation,
} from "./lib/location";
import { locateCurrent } from "./lib/helper";
import { buildSettings } from "./lib/settings";
import { getDaySchedule } from "./lib/prayers";
import { formatTime, ltrName } from "./lib/format";

type Mode = StoredLocation["mode"];

/** A saved city counts as this list entry when it's within a kilometer. */
const SAME_CITY_KM = 1;

function previewTimes(location: StoredLocation | undefined): string {
  if (!location) return "";
  const slots = getDaySchedule(new Date(), buildSettings(location).schedule);
  return slots.map((slot) => `${ltrName(slot.name)} ${formatTime(slot.start)}`).join(" · ");
}

function cityToLocation(city: CityResult): StoredLocation {
  return {
    mode: "city",
    latitude: city.latitude,
    longitude: city.longitude,
    label: cityLabel(city),
    countryCode: city.countryCode,
  };
}

/** Title for a city row; adds the region only when the name repeats within the country. */
function cityTitle(city: CityResult, repeated: ReadonlySet<string>): string {
  return repeated.has(city.name) && city.admin1 ? `${city.name}, ${city.admin1}` : city.name;
}

/**
 * Choose where prayer times are calculated: a city from searchable country and city dropdowns
 * (offline list, first city preselected), or the current location, refreshed before each prayer.
 */
export default function Command() {
  const countries = useMemo(listCountries, []);
  const { data: saved, isLoading: loadingSaved } = usePromise(readLocation);

  const [mode, setMode] = useState<Mode>("city");
  const [country, setCountry] = useState("PK");
  const [cityId, setCityId] = useState<string>();
  const initialized = useRef(false);

  useEffect(() => {
    if (loadingSaved || initialized.current) return;
    initialized.current = true;
    if (!saved) return;
    setMode(saved.mode);
    if (saved.countryCode) setCountry(saved.countryCode);
  }, [loadingSaved, saved]);

  const countryName = countries.find((item) => item.code === country)?.name;
  const { data: cities = [], isLoading: loadingCities } = usePromise(loadCities, [country, countryName]);

  // Offered only once the saved location and this country's cities have both loaded: the dropdown
  // reports its first item as a change when it renders items without a matching value, which would
  // replace the saved city with the alphabetically first one.
  const options = useMemo(
    () => (!loadingSaved && cities[0]?.countryCode === country ? cities : []),
    [loadingSaved, cities, country],
  );

  // Preselect the saved city when it's in this country, otherwise the alphabetically first one.
  // Worked out during render rather than in an effect, so the dropdown's first value is already right.
  const preselectedId = useMemo(() => {
    if (options.length === 0) return undefined;
    const savedCity =
      saved?.mode === "city" && saved.countryCode === country
        ? options.find((city) => distanceKm(city, saved) < SAME_CITY_KM)
        : undefined;
    return (savedCity ?? options[0]).id;
  }, [options, country, saved]);
  const selectedId = cityId && options.some((city) => city.id === cityId) ? cityId : preselectedId;

  const repeated = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const city of options) (seen.has(city.name) ? dupes : seen).add(city.name);
    return dupes;
  }, [options]);

  const selected = options.find((city) => city.id === selectedId);
  const preview = mode === "city" ? (selected ? cityToLocation(selected) : undefined) : saved;

  const submit = async () => {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Saving location…" });
    try {
      let location: StoredLocation;
      if (mode === "current") {
        toast.title = "Getting current location…";
        location = locationFromFix(await locateCurrent());
      } else {
        if (!selected) throw new Error("Pick a city first");
        location = cityToLocation(selected);
      }
      await writeLocation(location);
      toast.style = Toast.Style.Success;
      toast.title = `Location set: ${location.label}`;
      toast.message = previewTimes(location);
      try {
        await launchCommand({ name: "next-prayer", type: LaunchType.Background });
      } catch {
        // Background command not enabled yet; it syncs on its next run.
      }
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not set location";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return (
    <Form
      isLoading={loadingSaved}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Location" icon={Icon.Pin} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="mode" title="Location" value={mode} onChange={(value) => setMode(value as Mode)}>
        <Form.Dropdown.Item value="city" title="Choose a City" icon={Icon.Building} />
        <Form.Dropdown.Item value="current" title="Use Current Location" icon={Icon.Geopin} />
      </Form.Dropdown>

      {mode === "city" ? (
        <>
          <Form.Dropdown
            id="country"
            title="Country"
            value={country}
            onChange={(code) => {
              if (code === country) return;
              setCountry(code);
              setCityId(undefined);
            }}
          >
            {countries.map((item) => (
              <Form.Dropdown.Item key={item.code} value={item.code} title={item.name} keywords={[item.code]} />
            ))}
          </Form.Dropdown>
          {selectedId ? (
            // Created only once its cities are in, and anew per country: a dropdown whose items arrive
            // after it first rendered selects its first item, whatever value it's given.
            <Form.Dropdown
              key={country}
              id="city"
              title="City"
              value={selectedId}
              onChange={(id) => {
                if (id && options.some((city) => city.id === id)) setCityId(id);
              }}
            >
              {options.map((city) => (
                <Form.Dropdown.Item
                  key={city.id}
                  value={city.id}
                  title={cityTitle(city, repeated)}
                  keywords={city.admin1 ? [city.admin1] : undefined}
                />
              ))}
            </Form.Dropdown>
          ) : (
            <Form.Description title="City" text={loadingCities || loadingSaved ? "Loading cities…" : "No cities"} />
          )}
        </>
      ) : (
        <Form.Description
          title="Current location"
          text={
            "Uses macOS location services now, then again 30 minutes before each prayer. " +
            "If you've moved 5 km or more, times and reminders update."
          }
        />
      )}

      <Form.Separator />
      <Form.Description title="Saved" text={saved ? saved.label : "Not set"} />
      {preview && <Form.Description title="Today" text={previewTimes(preview)} />}
      {mode === "city" && (
        <Form.Description text="Cities with 5,000+ people, from GeoNames (CC BY 4.0). Works offline." />
      )}
    </Form>
  );
}
