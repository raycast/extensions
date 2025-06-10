import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { config } from "./config";
import { formatTime } from "./utils/hoursSystem";
import { City, Country, UserSelection, AthanResponse, AthanTimings, GeoNamesResponse } from "./types/types";
import { calculateRemainingTime, formatTimeRemaining, getNextPrayer } from "./utils/prayerUtils";

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
        // const response = await fetch(
        //   `https://api.countrystatecity.in/v1/countries/PS/cities`,
        //   {

        //     headers: {
        //       // Country State City API Key
        //       "X-CSCAPI-KEY": config.countryStateCityApiKey,
        //     },
        //   },
        // );
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
          <Action.Push
            title="Show Prayer Times"
            target={<AthanTimes selectedCountry={selectedCountry} selectedCity={selectedCity} />}
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

function AthanTimes({ selectedCountry, selectedCity }: UserSelection) {
  const [athanTimes, setAthanTimes] = useState<AthanTimings>();
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const { push } = useNavigation();

  const {
    value: hoursSystem,
    setValue: setHoursSystem,
    isLoading: isLoadingHoursSystem,
  } = useLocalStorage<string>("hoursSystem", "24");

  const { setValue: setSelectedCountry } = useLocalStorage<Country | undefined>("selectedCountry", undefined);
  const { setValue: setSelectedCity } = useLocalStorage<string | undefined>("selectedCity", undefined);

  const nextPrayer = athanTimes ? getNextPrayer(athanTimes) : null;

  // Countdown timer effect
  useEffect(() => {
    if (!nextPrayer) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const remainingMinutes = calculateRemainingTime(nextPrayer);
      const formattedTime = formatTimeRemaining(remainingMinutes);
      setTimeRemaining(formattedTime);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [nextPrayer]);

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
    async function getAthanTimes() {
      if (!selectedCountry || !selectedCity) {
        console.log("Missing country or city :", { selectedCountry, selectedCity });
        return;
      }

      try {
        setLoadingTimes(true);
        console.log("Fetching Prayer times for:", { selectedCountry, selectedCity });

        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity?country=${selectedCountry.name}&city=${selectedCity}`,
        );

        const data = (await response.json()) as AthanResponse;

        setAthanTimes(data.data.timings);

        showToast({
          style: Toast.Style.Success,
          title: "Prayer times loaded successfully",
        });
      } catch (error) {
        console.error("Failed to fetch prayer times : ", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch prayer times",
          message: error instanceof Error ? error.message : "Unknown Error",
        });
      } finally {
        setLoadingTimes(false);
      }
    }
    getAthanTimes();
  }, [selectedCountry, selectedCity]);

  if (loadingTimes) {
    showToast({
      style: Toast.Style.Animated,
      title: "Loading...",
    });
    return <List isLoading={true} navigationTitle="Loading Prayer Times..." />;
  }

  if (!athanTimes) {
    showToast({
      style: Toast.Style.Failure,
      title: "No Prayer Times Available",
    });
    return (
      <List navigationTitle="Prayer Times">
        <List.EmptyView title="No Prayer Times Available" description="Please select a country and city first" />
      </List>
    );
  }

  const getPrayerAccessories = (prayerName: string, prayerTime: string) => {
    const accessories = [];

    if (nextPrayer && nextPrayer.name === prayerName && nextPrayer.isWithinHour) {
      accessories.push({
        tag: {
          value: "Next",
          color: Color.Blue,
        },
      });
    }

    if (nextPrayer && nextPrayer.name === prayerName && timeRemaining) {
      accessories.push({
        tag: { value: `in ${timeRemaining}`, color: Color.Green },
        icon: Icon.Clock,
      });
    }

    accessories.push({
      text: formatTime(prayerTime, hoursSystem || "24"),
    });

    return accessories;
  };

  return (
    <List
      navigationTitle={`Prayer Times - ${selectedCountry?.name}, ${selectedCity}`}
      searchBarAccessory={
        <List.Dropdown
          id="hoursSystem"
          value={hoursSystem}
          isLoading={isLoadingHoursSystem}
          tooltip="Select a hours system"
          onChange={async (value) => {
            await setHoursSystem(value);
            showToast({
              style: Toast.Style.Success,
              title: `Switched to ${value === "24" ? "24-hour" : "12-hour"} format`,
            });
          }}
        >
          <List.Dropdown.Section title="Hours System">
            <List.Dropdown.Item title="24 hours" value="24" />
            <List.Dropdown.Item title="12 hours" value="12" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      // TODO : Main action are not showing
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
      <List.Section title="Obligatory Prayers Athan Times">
        <List.Item
          title="Fajr (الفجر)"
          icon={Icon.MoonDown}
          accessories={getPrayerAccessories("Fajr", athanTimes.Fajr)}
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
        <List.Item
          title="Dhuhr (الظهر)"
          icon={Icon.Sun}
          accessories={getPrayerAccessories("Dhuhr", athanTimes.Dhuhr)}
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
        <List.Item
          title="Asr (العصر)"
          icon={Icon.Sun}
          accessories={getPrayerAccessories("Asr", athanTimes.Asr)}
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
        <List.Item
          title="Maghrib - Sunset (المغرب)"
          icon={Icon.MoonUp}
          accessories={getPrayerAccessories("Maghrib", athanTimes.Maghrib)}
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
        <List.Item
          title="Isha (العشاء)"
          icon={Icon.Moon}
          accessories={getPrayerAccessories("Isha", athanTimes.Isha)}
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
      </List.Section>

      <List.Section title="Other Prayers">
        <List.Item
          title="Sunrise (الشروق)"
          icon={Icon.Sunrise}
          accessories={getPrayerAccessories("Sunrise", athanTimes.Sunrise)}
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

        <List.Item
          title="First third (الثلث الأول من الليل)"
          icon={Icon.StackedBars1}
          accessories={getPrayerAccessories("Firstthird", athanTimes.Firstthird)}
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
        <List.Item
          title="Midnight (منتصف الليل)"
          icon={Icon.CircleProgress50}
          accessories={getPrayerAccessories("Midnight", athanTimes.Midnight)}
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
        <List.Item
          title="Last third (الثلث الأخير من الليل)"
          icon={Icon.StackedBars3}
          accessories={getPrayerAccessories("Lastthird", athanTimes.Lastthird)}
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
      </List.Section>
    </List>
  );
}

export default function Command() {
  const { value: savedCountry } = useLocalStorage<Country | undefined>("selectedCountry", undefined);
  const { value: savedCity } = useLocalStorage<string | undefined>("selectedCity", undefined);

  if (savedCountry && savedCity) {
    return <AthanTimes selectedCountry={savedCountry} selectedCity={savedCity} />;
  }

  return (
    <List
      actions={
        <ActionPanel>
          <Action.Push title="Location Form" target={<LocationForm />} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="Welcome to Prayer Times"
        icon={{ source: "Icon-100.png" }}
        description="Please select a country and city to get started"
      />
    </List>
  );
}
