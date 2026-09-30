import WikipediaPage from "./components/wikipedia-page";
import { useLanguage } from "./utils/language";

export default function OpenPage(props: { arguments: { title: string } }) {
  const [language] = useLanguage();
  return <WikipediaPage title={props.arguments.title} language={language} />;
}
