import { useEffect, useState } from "react";
import { Document, Type } from "../models/paperlessResponse.model";
import { fetchDocumentTypes } from "../utils/fetchDocumentTypes";

export const useDocumentTypes = () => {
  const [docTypes, setDocTypes] = useState<Type[]>([]);

  useEffect(() => {
    async function getDocumentTypes() {
      const fetchedTypes = await fetchDocumentTypes();
      if (!ignore) {
        setDocTypes(fetchedTypes);
      }
    }

    let ignore = false;
    void getDocumentTypes();

    return () => {
      ignore = true;
    };
  }, []);

  const getDocumentType = (doc: Document) => {
    if (!docTypes.length) {
      return "";
    }
    const type = docTypes.find((type) => type.id === doc.document_type);
    return type?.name;
  };

  return { docTypes, getDocumentType };
};
