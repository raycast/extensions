import { useEffect, useState } from "react";
import { fetchCorrespondents } from "../utils/fetchCorrespondents";
import { Correspondent, Document } from "../models/paperlessResponse.model";

export const useCorrespondents = () => {
  const [correspondents, setCorrespondents] = useState<Correspondent[]>([]);

  useEffect(() => {
    async function getCorrespondents() {
      const corr = await fetchCorrespondents();
      if (!ignore) {
        setCorrespondents(corr);
      }
    }

    let ignore = false;
    void getCorrespondents();

    return () => {
      ignore = true;
    };
  }, []);

  const getCorrespondent = (doc: Document) => {
    if (!correspondents?.length) {
      return "";
    }
    const correspondent = correspondents.find((correspondent) => correspondent.id === doc.correspondent);
    return correspondent?.name;
  };

  return { getCorrespondent };
};
