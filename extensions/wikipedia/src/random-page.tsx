import { getRandomPageTitle } from "./wikipedia";
import { PageDetail } from "./page-detail";
import { useEffect, useState } from "react";

export default function RandomPage() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    getRandomPageTitle().then(setTitle);
  }, []);

  return <PageDetail title={title} />;
}
