import IAnalytics from "./analytics";
import IShows from "./shows";

interface IRequest {
  url: string;
  showId?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
}

interface IResponse {
  data: IShows | IAnalytics | undefined;
  isLoading: boolean;
  error?: { type: string; message: string; description: string };
}

export type { IRequest, IResponse };
