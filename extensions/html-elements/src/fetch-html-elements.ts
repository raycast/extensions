import axios from 'axios';
import { showToast, Toast } from "@raycast/api";

export type ElementDetails = {
  title: string;
  summary: string;
  mdn_url: string;
};

interface MDNApiResult {
  documents: Array<ElementDetails>;
}

const retrieveElementInfoFromMDN = async (element: string, language: string = 'en-US'): Promise<ElementDetails[]> => {
  const endpoint = "https://developer.mozilla.org/api/v1/search";
  const queryParameters = {
    q: element,
    sort: "best",
    locale: language,
  };
  try {
    const response = await axios.get<MDNApiResult>(endpoint, { params: queryParameters });
    return response.data.documents
      .filter(doc => doc.title.toLowerCase().startsWith(`<${element.toLowerCase()}>`))
      .map(doc => ({
        title: doc.title.split(':')[0],
        summary: doc.summary,
        mdn_url: `https://developer.mozilla.org${doc.mdn_url}`,
      }));
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: 'Error fetching HTML element information',
      message: String(error),
    });
    return [];
  }
};

export const fetchHtmlElements = async (searchTerm: string): Promise<ElementDetails[]> => {
  return retrieveElementInfoFromMDN(searchTerm);
};
