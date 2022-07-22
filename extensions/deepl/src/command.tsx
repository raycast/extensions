import { Language } from "./lib/deeplapi";
import TranslationResultList from "./components/TranslationResultList";

export default function command(targetLanguage: Language): () => JSX.Element {
  return () => <TranslationResultList targetLanguage={targetLanguage} />;
}
