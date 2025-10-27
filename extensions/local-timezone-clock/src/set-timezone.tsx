import { Action, ActionPanel, closeMainWindow, Detail, Form, Icon, LocalStorage, PopToRootType } from "@raycast/api";
import { useEffect, useState } from "react";

interface Region {
  id: string;
  regionName: string;
  cities: City[];
}

interface City {
  id: string;
  cityName: string;
  timezone: string;
  timezoneOffset: string;
}

export default function Command() {
  const [currentTimezone, setCurrentTimezone] = useState<string | null>(null);
  const [timezones, setTimezones] = useState<Region[]>([]);

  async function handleSubmit({ timezoneCity }: { timezoneCity: string }) {
    await LocalStorage.setItem("timezoneCity", timezoneCity);
    setCurrentTimezone(timezoneCity);
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  }

  function createTimezones() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const _timezones: string[] = (Intl as any).supportedValuesOf("timeZone");
    const regionsAndTimezones: Region[] = [];
    _timezones.forEach((tz: string) => {
      const region: string = tz.split("/")[0];
      const city: string = tz.split("/").pop()?.replaceAll("_", " ") as string;
      const index = regionsAndTimezones.findIndex((rtz) => rtz.regionName === region);
      if (index > -1) {
        // exists in list
        regionsAndTimezones[index].cities.push({
          id: `${index}x${regionsAndTimezones[index].cities.length}`,
          cityName: city,
          timezone: tz,
          timezoneOffset: new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
            .format(new Date())
            .split(",")[1]
            .trim(),
        });
      } else {
        // does not exist in list
        regionsAndTimezones.push({
          id: regionsAndTimezones.length.toString(),
          regionName: region,
          cities: [
            {
              id: `${regionsAndTimezones.length}x0`,
              cityName: city,
              timezone: tz,
              timezoneOffset: new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
                .format(new Date())
                .split(",")[1]
                .trim(),
            },
          ],
        });
      }
    });
    setTimezones(regionsAndTimezones);
  }

  useEffect(() => {
    // fetch timezone from LocalStorage
    const fetchTimezone = async () => {
      const timezone: string = (await LocalStorage.getItem<string>("timezoneCity")) as string;
      setCurrentTimezone(timezone);
    };
    fetchTimezone();

    createTimezones();
  }, []);

  if (currentTimezone === null || !timezones || timezones.length === 0) {
    return (
      <>
        <Detail markdown="Loading..." />
      </>
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save Changes" onSubmit={handleSubmit}></Action.SubmitForm>
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="timezoneCity"
        title="Choose a city"
        value={currentTimezone as string}
        onChange={setCurrentTimezone}
      >
        {timezones.map((tz) => {
          return (
            <Form.Dropdown.Section title={tz.regionName} key={tz.id}>
              {tz.cities.map((city) => {
                return (
                  <Form.Dropdown.Item
                    value={city.timezone}
                    title={`${city.cityName} ${city.timezoneOffset} (${city.timezone})`}
                    key={city.id}
                  />
                );
              })}
            </Form.Dropdown.Section>
          );
        })}
      </Form.Dropdown>

      <Form.Description text="Don't forget to save your changes!" />
      {/* TODO: add form item for changing the time format */}
    </Form>
  );
}
