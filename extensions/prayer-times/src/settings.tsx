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
  const cachedCity = cache.get("city") || "";
  const cachedMethod = cache.get("calculationMethod") || "2";
  const cachedDisplayMode = cache.get("displayMode") || "countdown";
  const cachedShowTextOnly = cache.get("showTextOnly") || "both";

  const isInList = MAJOR_CITIES.some((c) => c.toLowerCase() === cachedCity.toLowerCase());
  const [selectedCity, setSelectedCity] = useState(isInList ? cachedCity : "");
  const [customCity, setCustomCity] = useState(isInList ? "" : cachedCity);
  const [calculationMethod, setCalculationMethod] = useState(cachedMethod);
  const [displayMode, setDisplayMode] = useState(cachedDisplayMode);
  const [showTextOnly, setShowTextOnly] = useState(cachedShowTextOnly);

  const handleSubmit = async (values: FormValues) => {
    try {
      const city = values.customCity?.trim() || values.city || "";
      cache.set("city", city);
      cache.set("calculationMethod", values.calculationMethod || "2");
      cache.set("displayMode", values.displayMode || "countdown");
      cache.set("showTextOnly", values.showTextOnly || "both");

      await launchCommand({ name: "menubar", type: LaunchType.Background });
      await popToRoot();
      await closeMainWindow();

      await showToast({ style: Toast.Style.Success, title: "Settings saved" });
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
      <Form.Dropdown id="city" title="City" value={selectedCity} onChange={setSelectedCity} filtering>
        <Form.Dropdown.Item value="" title="Other (enter below)" />
        {MAJOR_CITIES.map((city) => (
          <Form.Dropdown.Item key={city} value={city} title={city} />
        ))}
      </Form.Dropdown>
      {!selectedCity && (
        <Form.TextField
          id="customCity"
          title="Custom City"
          value={customCity}
          onChange={setCustomCity}
          placeholder="Enter your city name"
        />
      )}
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
