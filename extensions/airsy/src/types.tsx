export interface IStationResult {
  id: number;
  stationName: string;
  city: {
    addressName: string;
    name: string;
  };
  index: {
    overall: string;
    pm10: string;
    pm25: string;
    so2: string;
    no2: string;
    o3: string;
    c6h6: string;
  };
  sensor: {
    pm10: number;
    pm25: number;
    so2: number;
    no2: number;
    co: number;
    o3: number;
    c6h6: number;
  };
}

export interface IStation {
  id: number;
  stationName: string;
  gegrLat: string;
  gegrLon: string;
  city: {
    id: number;
    name: string;
    commune: {
      communeName: string;
      districtName: string;
      provinceName: string;
    };
  };
  addressStreet: string;
}

export interface ISensor {
  id: number;
  stationId: number;
  param: {
    paramName: string;
    paramFormula: string;
    paramCode: string;
    idParam: number;
  };
}

export interface IData {
  key: string;
  values: [
    {
      date: string;
      value: number;
    }
  ];
}

export interface IIndex {
  id: number;
  stCalcDate: string;
  stIndexLevel: {
    id: number;
    indexLevelName: string;
  };
  stSourceDataDate: string;
  so2CalcDate: string;
  so2IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  so2SourceDataDate: string;
  no2CalcDate: string;
  no2IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  no2SourceDataDate: string;
  pm10CalcDate: string;
  pm10IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  pm10SourceDataDate: string;
  pm25CalcDate: string;
  pm25IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  pm25SourceDataDate: string;
  o3CalcDate: string;
  o3IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  o3SourceDataDate: string;
  c6h6CalcDate: string;
  c6h6IndexLevel: {
    id: number;
    indexLevelName: string;
  };
  c6h6SourceDataDate: string;
  stIndexStatus: boolean;
  stIndexCrParam: string;
}
