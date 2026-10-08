import { Cache } from "@raycast/api";
import { useEffect, useState } from "react";
import apiServer from "./api";
import { Category, MinifluxApiError } from "./types";
import { useErrorHandler } from "../utils/useErrorHandler";

const cache = new Cache();

export const useCategories = () => {
  const cached = cache.get("categories");
  const [categories, setCategories] = useState<Category[]>(cached ? JSON.parse(cached) : []);
  const handleError = useErrorHandler();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedCategories: Category[] = await apiServer.getCategories();
        setCategories(fetchedCategories);
        cache.set("categories", JSON.stringify(fetchedCategories));
      } catch (error) {
        handleError(error as MinifluxApiError);
      }
    };

    fetchData();
  }, []);

  return categories;
};
