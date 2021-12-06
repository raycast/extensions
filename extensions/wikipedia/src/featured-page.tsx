import { getRandomPageTitle, getTodayFeaturedPageTitle } from "./wikipedia";
import { PageSummary } from "./page-summary";
import { useEffect, useState } from "react";

export default function FeaturedPage() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    getTodayFeaturedPageTitle().then(setTitle);
  }, []);

  return <PageSummary title={title} />;
}