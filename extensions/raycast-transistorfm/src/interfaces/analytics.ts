interface IAnalyticDownloads {
  date: string;
  downloads: number;
}

interface IAnalyticRelationships {
  show: IAnalyticShow;
}

interface IAnalyticShow {
  data: IAnalyticShowData;
}

interface IAnalyticShowData {
  id: string;
  type: string;
}

interface IAnalyticAttributes {
  downloads: IAnalyticDownloads[];
}

interface IAnalyticData {
  id: string;
  type: string;
  attributes: IAnalyticAttributes;
  relationships: IAnalyticRelationships;
}

interface IAnalytics {
  data: IAnalyticData;
}

export default IAnalytics;
