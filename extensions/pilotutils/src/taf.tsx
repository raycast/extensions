import { LaunchProps } from "@raycast/api";
import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import React from "react";

interface State {
  icao?: string;
  response?: Array<TAF_DATA>;
  error?: Error;
}

type CLOUD = {
  cover: string;
  base: number;
  type: string;
};

type Forcast_Data = {
  timeGroup: number;
  timeFrom: number;
  timeTo: number;
  timeBec: number;
  fcstChange: string;
  probability: string;
  wdir: number;
  wspd: number;
  wgst: number;
  wshearHgt: number;
  wshearDir: number;
  wshearSpd: number;
  visib: number;
  altim: number;
  vertVis: string;
  wxString: string;
  notDecoded: string;
  clouds: Array<CLOUD>;
  icgTurb: [[object]];
  temp: [[object]];
};

type TAF_DATA = {
  tafId: number;
  icaoId: string;
  dbPopTime: string;
  bulletinTime: string;
  issueTime: string;
  validTimeFrom: number;
  validTimeTo: number;
  rawTAF: string;
  mostRecent: number;
  remarks: string;
  lat: number;
  lon: number;
  elev: number;
  prior: number;
  name: string;
  fcsts: Array<Forcast_Data>;
};

async function fetchTAF(icao: string): Promise<Array<TAF_DATA>> {
  const response = await fetch(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`);
  const data = (await response.json()) as Array<TAF_DATA>;

  return data;
}

function drawForecast(fcst: Forcast_Data) {
  return (
    <React.Fragment key={uuidv4()}>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label key={uuidv4()} title="Forcast" />
      {fcst.timeGroup && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Time Group" text={fcst.timeGroup.toString()} />
      )}
      {fcst.timeFrom && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Time From" text={fcst.timeFrom.toString()} />
      )}
      {fcst.timeTo && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Time To" text={fcst.timeTo.toString()} />}
      {fcst.timeBec && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Time Becoming" text={fcst.timeBec.toString()} />
      )}
      {fcst.fcstChange && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Forecast Change" text={fcst.fcstChange.toString()} />
      )}
      {fcst.probability && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Probability" text={fcst.probability.toString()} />
      )}
      {fcst.wdir && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Direction" text={fcst.wdir.toString()} />
      )}
      {fcst.wspd && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Speed" text={fcst.wspd.toString()} />}
      {fcst.wgst && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Gust" text={fcst.wgst.toString()} />}
      {fcst.wshearHgt && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Shear Height" text={fcst.wshearHgt.toString()} />
      )}
      {fcst.wshearDir && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Shear Direction" text={fcst.wshearDir.toString()} />
      )}
      {fcst.wshearSpd && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Wind Shear Speed" text={fcst.wshearSpd.toString()} />
      )}
      {fcst.visib && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Visibility" text={fcst.visib.toString()} />}
      {fcst.altim && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Altimeter" text={fcst.altim.toString()} />}
      {fcst.vertVis && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Vertical Visibility" text={fcst.vertVis.toString()} />
      )}
      {fcst.wxString && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Weather" text={fcst.wxString.toString()} />
      )}
      {fcst.notDecoded && (
        <List.Item.Detail.Metadata.Label key={uuidv4()} title="Not Decoded" text={fcst.notDecoded.toString()} />
      )}
      {fcst.clouds && <List.Item.Detail.Metadata.Label key={uuidv4()} title="Clouds" />}
      {fcst.clouds &&
        fcst.clouds.map((cloud) => (
          <List.Item.Detail.Metadata.Label key={uuidv4()} title={`${cloud.cover}`} text={`${cloud.base}ft`} />
        ))}
    </React.Fragment>
  );
}

export default function TAF(props: LaunchProps<{ arguments: Arguments.Taf }>) {
  const [state, setState] = useState<State>({});

  const icao = props.arguments.icao;

  useEffect(() => {
    async function getTaf() {
      try {
        const resp = fetchTAF(icao);
        setState({ icao: icao, response: await resp });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    }

    getTaf();
  }, []);

  return (
    <List isLoading={!state.response && !state.error} isShowingDetail>
      {state.response?.map((taf) => (
        <List.Item
          key={taf.tafId}
          title={taf.icaoId}
          subtitle={taf.name}
          detail={
            <List.Item.Detail
              markdown={`\# ${taf.icaoId}\n\#\# ${taf.name}\n\`\`\`${taf.rawTAF}\`\`\``} // eslint-disable-line no-useless-escape
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="ICAO" text={taf.icaoId} />
                  <List.Item.Detail.Metadata.Label title="Name" text={taf.name} />
                  <List.Item.Detail.Metadata.Label title="Latitude" text={taf.lat.toString()} />
                  <List.Item.Detail.Metadata.Label title="Longitude" text={taf.lon.toString()} />
                  <List.Item.Detail.Metadata.Label title="Field Elevation" text={`${taf.elev.toString()}ft`} />
                  {taf.remarks && <List.Item.Detail.Metadata.Label title="Remarks" text={taf.remarks} />}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Issue Time" text={taf.issueTime} />
                  <List.Item.Detail.Metadata.Label title="Valid Time From" text={taf.validTimeFrom.toString()} />
                  <List.Item.Detail.Metadata.Label title="Valid Time To" text={taf.validTimeTo.toString()} />
                  <List.Item.Detail.Metadata.Separator />

                  {taf.fcsts && taf.fcsts.map((fcst) => drawForecast(fcst))}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
