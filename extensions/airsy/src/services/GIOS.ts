import { useEffect, useState } from "react";
import fetch, { RequestInit } from "node-fetch";
import { ISensor, IStation, IData, IIndex, IStationResult } from "../types";
import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";

const URLS = {
  stations: "/station/findAll",
  station: "/station/sensors/{station_id}",
  sensor: "/data/getData/{sensor_id}",
  index: "/aqindex/getIndex/{station_id}",
};

function request<TResponse>(url: string, config: RequestInit = {}): Promise<TResponse> {
  const baseUrl = "https://api.gios.gov.pl/pjp-api/rest";
  return fetch(baseUrl + url, config)
    .then((response) => response.json())
    .then((data) => data as TResponse);
}

const getStations = async () => {
  return await request<IStation[]>(URLS.stations);
};

const getSensorsFromStation = async (stationId: number) => {
  return await request<ISensor[]>(URLS.station.replace("{station_id}", stationId.toString()));
};

const getSensorData = async (sensorId: number) => {
  return await request<IData>(URLS.sensor.replace("{sensor_id}", sensorId.toString()));
};

const getStationIndex = async (stationId: number) => {
  return await request<IIndex>(URLS.index.replace("{station_id}", stationId.toString()));
};

const getStationData = async (stationId: number) => {
  const sensors = await getSensorsFromStation(stationId);
  const sensorData = await Promise.all(
    sensors.map(async (sensor: ISensor) => {
      const data = await getSensorData(sensor.id);

      return {
        paramName: sensor.param.paramName,
        paramCode: sensor.param.paramCode,
        value: data?.values[0]?.value,
        date: data?.values[0]?.date,
      };
    })
  );
  const index = await getStationIndex(stationId);

  const getValueForParam = (paramCode: string) => {
    const sensor = sensorData.find((sensor) => sensor.paramCode === paramCode);
    return sensor?.value;
  };

  return {
    sensor: {
      pm10: getValueForParam("PM10"),
      pm25: getValueForParam("PM25"),
      so2: getValueForParam("SO2"),
      no2: getValueForParam("NO2"),
      co: getValueForParam("CO"),
      o3: getValueForParam("O3"),
      c6h6: getValueForParam("C6H6"),
    },
    index: {
      overall: index?.stIndexLevel?.indexLevelName,
      pm10: index?.pm10IndexLevel?.indexLevelName,
      pm25: index?.pm25IndexLevel?.indexLevelName,
      so2: index?.so2IndexLevel?.indexLevelName,
      no2: index?.no2IndexLevel?.indexLevelName,
      o3: index?.o3IndexLevel?.indexLevelName,
      c6h6: index?.c6h6IndexLevel?.indexLevelName,
    },
  };
};

const getStationsData = async () => {
  const data = await getStations();

  const stations = data.sort((a: IStation, b: IStation) => a.city.name.localeCompare(b.city.name));

  const stationsData: IStationResult[] = await Promise.all(
    stations.map(async (station) => {
      const data = await getStationData(station.id);
      return <IStationResult>{
        id: station.id,
        stationName: station.stationName.trim(),
        city: {
          addressName: station.addressStreet,
          name: station.city.name,
        },
        ...data,
      };
    })
  );
  return stationsData;
};

const useStations = (city = "") => {
  const { isLoading, data } = useCachedPromise(
    async () => {
      const response = await getStationsData();
      return response;
    },
    [],
    {
      initialData: [],
      keepPreviousData: true,
      onError: async () => {
        await showToast(Toast.Style.Failure, "Error", "Something went wrong.");
      },
    }
  );

  if (city !== "") {
    return { stations: data?.filter((station: IStationResult) => station.city.name === city), isLoading: isLoading };
  }

  return { stations: data, isLoading: isLoading };
};
export default useStations;
