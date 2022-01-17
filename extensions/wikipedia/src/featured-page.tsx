import { getRandomPageTitle, getTodayFeaturedPageTitle } from "./wikipedia";
import { PageDetail } from "./page-detail";
import { useEffect, useState } from "react";

export default function FeaturedPage() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    getTodayFeaturedPageTitle().then(setTitle);
  }, []);

  return <PageDetail title={title} />;
}