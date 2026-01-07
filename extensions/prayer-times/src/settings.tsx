import { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  Cache,
  showToast,
  Toast,
  Icon,
  launchCommand,
  LaunchType,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";

const cache = new Cache();

const CALCULATION_METHODS = [
  { title: "Muslim World League", value: "3" },
  { title: "Islamic Society of North America", value: "2" },
  { title: "Egyptian General Authority of Survey", value: "5" },
  { title: "Umm Al-Qura University, Makkah", value: "4" },
  { title: "University of Islamic Sciences, Karachi", value: "1" },
  { title: "Institute of Geophysics, University of Tehran", value: "7" },
  { title: "Shia Ithna-Ashari, Leva Institute, Qum", value: "10" },
  { title: "Gulf Region", value: "8" },
  { title: "Kuwait", value: "9" },
  { title: "Qatar", value: "15" },
  { title: "Majlis Ugama Islam Singapura, Singapore", value: "11" },
  { title: "Union Organization islamic de France", value: "12" },
  { title: "Diyanet İşleri Başkanlığı, Turkey", value: "13" },
  { title: "Spiritual Administration of Muslims of Russia", value: "14" },
];

const MAJOR_CITIES = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Toronto",
  "London",
  "Paris",
  "Berlin",
  "Madrid",
  "Rome",
  "Dubai",
  "Abu Dhabi",
  "Riyadh",
  "Jeddah",
  "Mecca",
  "Medina",
  "Dammam",
  "Kuwait City",
  "Doha",
  "Manama",
  "Muscat",
  "Cairo",
  "Alexandria",
  "Istanbul",
  "Ankara",
  "Tehran",
  "Karachi",
  "Lahore",
  "Islamabad",
  "Dhaka",
  "Jakarta",
  "Kuala Lumpur",
  "Singapore",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Lagos",
  "Cape Town",
  "Sydney",
  "Melbourne",
  "Auckland",
  "Moscow",
  "Tashkent",
  "Almaty",
  "Baku",
];

type FormValues = {
  city?: string;
  customCity?: string;
  calculationMethod?: string;
  displayMode?: string;
  showTextOnly?: string;
};

export default function Settings() {
  const cachedCity = cache.get("city");
  const cachedMethod = cache.get("calculationMethod");
  const cachedDisplayMode = cache.get("displayMode");
  const cachedShowTextOnly = cache.get("showTextOnly");
  const [city, setCity] = useState(cachedCity || "");
  const [calculationMethod, setCalculationMethod] = useState(cachedMethod || "2");
  const [displayMode, setDisplayMode] = useState(cachedDisplayMode || "countdown");
  const [showTextOnly, setShowTextOnly] = useState(cachedShowTextOnly || "both");

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
  };

  const handleSubmit = async (values: FormValues) => {
    try {
      const finalCity = values.customCity || values.city || "";
      cache.set("city", finalCity);
      cache.set("calculationMethod", values.calculationMethod || "2");
      cache.set("displayMode", values.displayMode || "countdown");
      cache.set("showTextOnly", values.showTextOnly || "both");

      await launchCommand({ name: "prayer", type: LaunchType.Background });
      await popToRoot();
      await closeMainWindow();

      await showToast({
        style: Toast.Style.Success,
        title: "Settings saved",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error saving settings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Checkmark} title="Save Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="city"
        title="City (Select from list)"
        value={MAJOR_CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) ? city : ""}
        onChange={handleCityChange}
        filtering
        storeValue={false}
      >
        <Form.Dropdown.Item value="" title="Select a city..." />
        {MAJOR_CITIES.map((cityName) => (
          <Form.Dropdown.Item key={cityName} value={cityName} title={cityName} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="customCity"
        title="Or Enter Custom City"
        value={city && !MAJOR_CITIES.find((c) => c.toLowerCase() === city.toLowerCase()) ? city : ""}
        onChange={handleCityChange}
        placeholder="Type your city name if not in list above"
      />
      <Form.Dropdown
        id="calculationMethod"
        title="Calculation Method"
        value={calculationMethod}
        onChange={setCalculationMethod}
      >
        {CALCULATION_METHODS.map((method) => (
          <Form.Dropdown.Item key={method.value} value={method.value} title={method.title} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="displayMode" title="Display Mode" value={displayMode} onChange={setDisplayMode}>
        <Form.Dropdown.Item value="countdown" title="Next Prayer Countdown" />
        <Form.Dropdown.Item value="next" title="Next Prayer Time" />
      </Form.Dropdown>
      <Form.Dropdown id="showTextOnly" title="Menu Bar Display" value={showTextOnly} onChange={setShowTextOnly}>
        <Form.Dropdown.Item value="both" title="Icon and Text" />
        <Form.Dropdown.Item value="text" title="Text Only" />
        <Form.Dropdown.Item value="icon" title="Icon Only" />
      </Form.Dropdown>
    </Form>
  );
}
