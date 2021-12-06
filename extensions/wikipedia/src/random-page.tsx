import { getRandomPageTitle } from "./wikipedia";
import { PageSummary } from "./page-summary";
import { useEffect, useState } from "react";

export default function RandomPage() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    getRandomPageTitle().then(setTitle);
  }, []);

  return <PageSummary title={title} />;
}