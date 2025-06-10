import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { config } from "./config";
import { formatTime } from "./utils/hoursSystem";
import { Country, City, AthanTimings, AthanResponse, GeoNamesResponse } from "./types/types";

type DailyAthanTimes = {
  date: string;
  formattedDate: string;
  timings: AthanTimings;
};

function LocationForm() {
  // Countries
  const [countries, setCountries] = useState<Country[]>();

  // Cities
  const [cities, setCities] = useState<City[]>();
  const [loadingCities, setLoadingCities] = useState(false);

  const {
    value: selectedCountry,
    setValue: setSelectedCountry,
    isLoading: isLoadingCountry,
  } = useLocalStorage<Country | undefined>("selectedCountry", undefined);

  const {
    value: selectedCity,
    setValue: setSelectedCity,
    isLoading: isLoadingCity,
  } = useLocalStorage<string | undefined>("selectedCity", undefined);

  const { push } = useNavigation();

  useEffect(() => {
    async function fetchCountries() {
      try {
        console.log("Start Fetching countries...");

        const response = await fetch("https://api.countrystatecity.in/v1/countries/", {
          headers: {
            // Country State City API Key, I know it is not secure, I did not find a way to hide the API Key in Raycast Extension 😕
            "X-CSCAPI-KEY": config.countryStateCityApiKey,
          },
        });
        const data = (await response.json()) as Country[];

        const filteredCountries = data.filter((country) => country.iso2 !== "IL");

        console.log("Countries fetched : ", data.length);
        setCountries(filteredCountries);
      } catch (error) {
        console.error("Failed to fetch countries:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch countries",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      }
    }
    fetchCountries();
  }, []);

  useEffect(() => {
    async function fetchCities() {
      if (!selectedCountry) {
        setCities(undefined);
        return;
      }

      console.log("Fetching cities for country : ", selectedCountry);
      setLoadingCities(true);

      try {
        const response = await fetch(
          // GeoNames API, a Username for a user enabled webservice is required
          `http://api.geonames.org/searchJSON?country=${selectedCountry.iso2}&featureClass=P&maxRows=1000&username=${config.geonamesUsername}`,
        );

        const data = (await response.json()) as GeoNamesResponse;

        console.log("Cities Fetched : ", data.geonames.length);

        setCities(data.geonames);
      } catch (error) {
        setCities([]);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch cities",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      } finally {
        setLoadingCities(false);
      }
    }
    fetchCities();
  }, [selectedCountry]);

  const isLoading = isLoadingCountry || isLoadingCity || loadingCities || !countries;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Location Form"
      actions={
        <ActionPanel>
          <Action
            title="Show 14-Day Prayer Times"
            onAction={() => {
              if (selectedCountry && selectedCity) {
                push(<FourteenDaysAthanTimes selectedCountry={selectedCountry} selectedCity={selectedCity} />);
              } else {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Please select both country and city",
                });
              }
            }}
          />
          <Action
            title="Clear Saved Data"
            style={Action.Style.Destructive}
            onAction={async () => {
              await setSelectedCountry(undefined);
              await setSelectedCity(undefined);
              showToast({
                style: Toast.Style.Success,
                title: "Saved data cleared",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="country"
        title="country"
        value={selectedCountry?.iso2}
        onChange={async (value) => {
          const country = countries?.find((country) => country.iso2 === value);
          if (country) {
            await setSelectedCountry(country);
            // Clearing city when country changes
            await setSelectedCity(undefined);
          }
        }}
      >
        <Form.Dropdown.Item title="Select a country..." value="" />
        {countries?.map((country) => {
          return (
            <Form.Dropdown.Item key={country.iso2} value={country.iso2} title={country.name} icon={country.emoji} />
          );
        })}
      </Form.Dropdown>

      {selectedCountry && (
        <Form.Dropdown id="city" title="city" value={selectedCity || ""} onChange={setSelectedCity}>
          <Form.Dropdown.Item title="Select a city..." value="" />
          {cities?.map((city) => {
            return (
              <Form.Dropdown.Item key={`${selectedCountry.iso2}-${city.name}`} value={city.name} title={city.name} />
            );
          })}
        </Form.Dropdown>
      )}

      {selectedCountry && (
        <Form.Description text={`Selected: ${selectedCountry.name}${selectedCity ? `, ${selectedCity}` : ""}`} />
      )}
    </Form>
  );
}

function FourteenDaysAthanTimes({ selectedCountry, selectedCity }: { selectedCountry: Country; selectedCity: string }) {
  const [dailyAthanTimes, setDailyAthanTimes] = useState<DailyAthanTimes[]>([]);
  const [loading, setLoading] = useState(false);

  const { push } = useNavigation();

  const {
    value: hoursSystem,
    setValue: setHoursSystem,
    isLoading: isLoadingHoursSystem,
  } = useLocalStorage<string>("hoursSystem", "24");

  const { setValue: setSelectedCountry } = useLocalStorage<Country | undefined>("selectedCountry", undefined);
  const { setValue: setSelectedCity } = useLocalStorage<string | undefined>("selectedCity", undefined);

  async function clearSavedLocation() {
    try {
      await setSelectedCountry(undefined);
      await setSelectedCity(undefined);

      push(<LocationForm />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to clear location",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    async function fetch14DaysAthanTimes() {
      if (!selectedCountry || !selectedCity) {
        return;
      }

      try {
        setLoading(true);
        const results: DailyAthanTimes[] = [];

        // Generate dates for the next 14 days and fetch them sequentially to avoid rate limiting
        for (let i = 0; i < 14; i++) {
          const date = new Date();
          date.setDate(date.getDate() + i);

          // Convert to DD-MM-YYYY format as required by the API
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();
          const dateString = `${day}-${month}-${year}`; // DD-MM-YYYY format

          const formattedDate = date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });

          try {
            console.log(`Fetching prayer times for ${dateString}...`);

            const response = await fetch(
              `https://api.aladhan.com/v1/timingsByCity/${dateString}?city=${selectedCity}&country=${selectedCountry.iso2}`,
            );
            const data = (await response.json()) as AthanResponse;

            console.log(`API Response for ${dateString}:`, data);

            if (!data.data || !data.data.timings) {
              console.error(`Invalid API response for ${dateString}:`, data);
              continue; // Skip this day if the response is invalid
            }

            results.push({
              date: dateString,
              formattedDate,
              timings: data.data.timings,
            });

            // Add a small delay between requests to respect rate limits
            if (i < 13) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          } catch (dayError) {
            console.error(`Failed to fetch prayer times for ${dateString}:`, dayError);
            // Continue with other days even if one fails
          }
        }

        setDailyAthanTimes(results);

        showToast({
          style: Toast.Style.Success,
          title: "14-day prayer times loaded successfully",
        });
      } catch (error) {
        console.error("Failed to fetch 14-day prayer times:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch prayer times",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetch14DaysAthanTimes();
  }, [selectedCountry, selectedCity]);

  if (loading) {
    return <List isLoading={true} navigationTitle="Loading 14-Day Prayer Times..." />;
  }

  if (dailyAthanTimes.length === 0) {
    return (
      <List navigationTitle="14-Day Prayer Times">
        <List.EmptyView title="No Prayer Times Available" description="Failed to load prayer times" />
      </List>
    );
  }

  return (
    <List
      isShowingDetail
      navigationTitle={`14-Day Prayer Times - ${selectedCountry.name}, ${selectedCity}`}
      searchBarAccessory={
        <List.Dropdown
          value={hoursSystem}
          isLoading={isLoadingHoursSystem}
          tooltip="Select time format"
          onChange={async (value) => {
            await setHoursSystem(value);
            showToast({
              style: Toast.Style.Success,
              title: `Switched to ${value === "24" ? "24-hour" : "12-hour"} format`,
            });
          }}
        >
          <List.Dropdown.Section title="Time Format">
            <List.Dropdown.Item title="24 hours" value="24" />
            <List.Dropdown.Item title="12 hours" value="12" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Settings">
            <Action title="Change Location" onAction={clearSavedLocation} icon={Icon.Map} />
            <Action.OpenInBrowser
              title="I Have an Issue!"
              url="https://iabdullah.dev/en/athan-times-form"
              icon={Icon.Exclamationmark}
              shortcut={{ modifiers: ["cmd"], key: "i" }}
            />
            <Action.OpenInBrowser
              title="I Have Feedback, Suggestions"
              url="https://iabdullah.dev/en/athan-times-form"
              icon={Icon.Message}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {dailyAthanTimes.map((dayData) => (
        <List.Item
          key={dayData.date}
          title={dayData.formattedDate}
          icon={Icon.Calendar}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Obligatory Prayers" />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Fajr (الفجر)"
                    icon={Icon.MoonDown}
                    text={formatTime(dayData.timings.Fajr, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Dhuhr (الظهر)"
                    icon={Icon.Sun}
                    text={formatTime(dayData.timings.Dhuhr, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Asr (العصر)"
                    icon={Icon.Sun}
                    text={formatTime(dayData.timings.Asr, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Maghrib - Sunset (المغرب)"
                    icon={Icon.MoonUp}
                    text={formatTime(dayData.timings.Maghrib, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Isha (العشاء)"
                    icon={Icon.Moon}
                    text={formatTime(dayData.timings.Isha, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Other Times" />
                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label
                    title="Sunrise (الشروق)"
                    icon={Icon.Sunrise}
                    text={formatTime(dayData.timings.Sunrise, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="First third (الثلث الأول من الليل)"
                    icon={Icon.StackedBars1}
                    text={formatTime(dayData.timings.Firstthird, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Midnight (منتصف الليل)"
                    icon={Icon.CircleProgress50}
                    text={formatTime(dayData.timings.Midnight, hoursSystem || "24")}
                  />

                  <List.Item.Detail.Metadata.Label
                    title="Last third (الثلث الأخير من الليل)"
                    icon={Icon.StackedBars3}
                    text={formatTime(dayData.timings.Lastthird, hoursSystem || "24")}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action title="Change Location" onAction={clearSavedLocation} icon={Icon.Map} />
              <Action.OpenInBrowser
                title="There Is an Issue!"
                url="https://iabdullah.dev/en/athan-times-form"
                icon={Icon.ExclamationMark}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
              <Action.OpenInBrowser
                title="I Have Feedback, Suggestions"
                url="https://iabdullah.dev/en/athan-times-form"
                icon={Icon.Message}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const { value: savedCountry, isLoading: isLoadingCountry } = useLocalStorage<Country | undefined>(
    "selectedCountry",
    undefined,
  );
  const { value: savedCity, isLoading: isLoadingCity } = useLocalStorage<string | undefined>("selectedCity", undefined);

  if (isLoadingCountry || isLoadingCity) {
    return <List isLoading={true} navigationTitle="Loading..." />;
  }

  if (!savedCountry || !savedCity) {
    return <LocationForm />;
  }

  return <FourteenDaysAthanTimes selectedCountry={savedCountry} selectedCity={savedCity} />;
}
