import { LaunchProps } from "@raycast/api";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

interface State {
  icao?: string;
  response?: Array<METAR_DATA>;
  error?: Error;
}

type METAR_DATA = {
  metar_id: number;
  icaoId: string;
  receiptTime: string;
  obsTime: number;
  reportTime: string;
  reportTime_local: string;
  temp: number;
  dewp: number;
  wdir: number;
  wspd: number;
  wgst: number;
  visib: number;
  altim: number;
  slp: number;
  qcField: number;
  wxString: string;
  presTend: string;
  maxT: number;
  minT: number;
  maxT24: number;
  minT24: number;
  precip: string;
  pcp3hr: number;
  pcp6hr: number;
  pcp24hr: number;
  snow: string;
  vertVis: string;
  metarType: string;
  rawOb: string;
  mostRecent: string;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  name: string;
  clouds: Array<CLOUD>;
  pressure_alt: number;
  density_alt: number;
};

type CLOUD = {
  cover: string;
  base: number;
};

async function fetchMetar(icao: string): Promise<Array<METAR_DATA>> {
  const response = await fetch(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`);
  const data = (await response.json()) as Array<METAR_DATA>;
  data.forEach((metar) => {
    const rt = new Date(metar.reportTime + "Z");
    metar.reportTime_local = rt.toLocaleString();
    metar.altim = convertMbToInHg(metar.altim);
    metar.pressure_alt = Math.round((29.92 - metar.altim) * 1000) + metar.elev;
    metar.density_alt = calculateDensityAltitude(metar);
  });
  return data;
}

function convertMbToInHg(mb: number): number {
  const inHg = mb * 0.02953;
  return inHg;
}

function calculateDensityAltitude(metar: METAR_DATA): number {
  const temperature = metar.temp;
  const pressureAltitude = metar.pressure_alt;

  const temperatureInCelsius = (temperature - 32) * (5 / 9);
  const temperatureInKelvin = temperatureInCelsius + 273.15;

  const pressureInHg = metar.altim;
  const pressureInHpa = pressureInHg * 33.8639;

  const pressureAtSeaLevelInHpa =
    pressureInHpa / Math.pow(1 - (0.0065 * pressureAltitude) / temperatureInKelvin, 5.2561);

  const densityAltitude =
    (temperatureInKelvin / 0.0065) * (1 - Math.pow(pressureAtSeaLevelInHpa / pressureInHpa, 0.190284)) - 273.15;

  return Math.round(densityAltitude);
}

export default function METAR(props: LaunchProps<{ arguments: Arguments.Metar }>) {
  const [state, setState] = useState<State>({});

  const icao = props.arguments.icao;

  useEffect(() => {
    async function getMetar() {
      try {
        const resp = fetchMetar(icao);
        setState({ icao: icao, response: await resp });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    getMetar();
  }, []);

  return (
    <List isLoading={!state.response && !state.error} isShowingDetail>
      {state.response?.map((metar) => (
        <List.Item
          key={metar.metar_id}
          title={metar.icaoId}
          subtitle={metar.name}
          detail={
            <List.Item.Detail
              markdown={` \# ${metar.icaoId}\n\#\# ${metar.name}\n\`\`\`${metar.rawOb}\`\`\``} // eslint-disable-line no-useless-escape
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ICAO" text={metar.icaoId} />
                  <List.Item.Detail.Metadata.Label title="Name" text={metar.name} />
                  <List.Item.Detail.Metadata.Label title="Latitude" text={metar.lat.toString()} />
                  <List.Item.Detail.Metadata.Label title="Longitude" text={metar.lon.toString()} />
                  <List.Item.Detail.Metadata.Label title="Field Elevation" text={`${metar.elev.toString()}ft`} />
                  <List.Item.Detail.Metadata.Label
                    title="Pressure Altitude"
                    text={`${metar.pressure_alt.toString()}ft`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Density Altitude"
                    text={`${metar.density_alt.toString()}ft`}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Observation Time" text={metar.obsTime.toString()} />
                  <List.Item.Detail.Metadata.Label title="Report Time (Zulu)" text={metar.reportTime.toString()} />
                  <List.Item.Detail.Metadata.Label
                    title="Report Time (Local)"
                    text={metar.reportTime_local.toString()}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Temperature" text={`${metar.temp.toString()} °C`} />
                  <List.Item.Detail.Metadata.Label title="Dewpoint" text={`${metar.dewp.toString()} °C`} />
                  <List.Item.Detail.Metadata.Label title="Altimeter" text={`${metar.altim.toString()} inHg`} />
                  <List.Item.Detail.Metadata.Label title="Wind Direction" text={metar.wdir.toString()} />
                  <List.Item.Detail.Metadata.Label title="Wind Speed" text={`${metar.wspd.toString()} Knots`} />
                  {metar.wgst && (
                    <List.Item.Detail.Metadata.Label title="Wind Gust" text={`${metar.wgst.toString()} Knots`} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Visibility" text={`${metar.visib.toString()} SM`} />
                  {metar.wxString && <List.Item.Detail.Metadata.Label title="Weather" text={metar.wxString} />}
                  {metar.pcp3hr && (
                    <List.Item.Detail.Metadata.Label title="3 Hour Precipitation" text={metar.pcp3hr.toString()} />
                  )}
                  {metar.pcp6hr && (
                    <List.Item.Detail.Metadata.Label title="6 Hour Precipitation" text={metar.pcp6hr.toString()} />
                  )}
                  {metar.pcp24hr && (
                    <List.Item.Detail.Metadata.Label title="24 Hour Precipitation" text={metar.pcp24hr.toString()} />
                  )}
                  {metar.snow && <List.Item.Detail.Metadata.Label title="Snow" text={metar.snow.toString()} />}
                  {metar.clouds && <List.Item.Detail.Metadata.Separator />}
                  {metar.clouds &&
                    metar.clouds.map((cloud) => (
                      <List.Item.Detail.Metadata.Label
                        key={uuidv4()}
                        title={`${cloud.cover}`}
                        text={`${cloud.base}ft`}
                      />
                    ))}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
