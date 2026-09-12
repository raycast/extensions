type RiskImage = {
  src: string;
  alt?: string;
};

type Area = {
  riskImage: RiskImage;
  riskText?: string;
  areaName: string;
  areas: string;
  url: string;
  slug: string;
};

type Forecast = {
  heading: string;
  validUntilText: string;
  validToDate: string;
  areaPageLinks: Area[];
};

type DetailedArea = {
  avalancheHazardText: string;
  forecast: {
    id: number;
    risk: number;
    riskImage: {
      src: string;
      alt: string;
    };
    riskLabel: string;
    anchorLinkPrefix: string;
    areaId: number;
    validTo: string;
    validToPrefix: string;
    validFrom: string;
    validFromPrefix: string;
    changeDate: string;
    location: string;
    riskHeading: string;
    recommendation: string;
    probability: string;
    publishedDate: Date;
    sizeDistribution: string;
    assessmentHeading: string;
    assessmentSubtitle: string;
    assessmentContent: string;
    trend: {
      trendRisk: number;
      trendDate: Date;
      trendLabel: string;
      trendHeading: null;
      trendContent: null;
      trendImage: {
        src: string;
        alt: string;
      };
    };
    avalancheProblem: {
      problems: {
        heading: string;
        description: {
          title: string;
          content: string;
        };
      }[];
    };
    snowInfo: {
      heading: string;
      content: string;
    };
    weatherInfo: {
      heading: string;
      content: string;
    };
  };
};

export type { Forecast, Area, DetailedArea };
