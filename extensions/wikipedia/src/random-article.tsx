import { getRandomArticle } from "./wikipedia";
import { ArticleSummary } from "./article-summary";
import { useEffect, useState } from "react";

export default function RandomArticle() {
  const [title, setTitle] = useState("");

  useEffect(() => {
    getRandomArticle().then(setTitle);
  }, []);

  return <ArticleSummary title={title} />;
}