import { List } from "@raycast/api";
import { random } from "lodash";
import { useEffect, useMemo, useState } from "react";

type TemplateRepositoryFieldsFragment = {
  name: string;
  url: string;
  id: string;
  stargazerCount: number;
  owner: { name?: string | null; login?: string; avatarUrl: string };
  issues: { totalCount: number };
  pullRequests: { totalCount: number };
};

type TemplateListEmptyViewProps = {
  searchText: string;
  isLoading: boolean;
  sampleRepositories: TemplateRepositoryFieldsFragment[] | undefined;
};

function searchStringInArray(str: string, strArray: string[] | undefined) {
  if (strArray) {
    for (let j = 0; j < strArray.length; j++) {
      if (strArray[j].match(str)) {
        return strArray[j];
      }
    }
  }
  return "";
}

export default function TemplateListEmptyView({
  searchText,
  isLoading,
  sampleRepositories,
}: TemplateListEmptyViewProps) {
  const example = useMemo(
    () =>
      sampleRepositories?.map((repository) => {
        return repository.name;
      })[random(0, sampleRepositories?.length - 1)],
    []
  );

  const sampleRepositoriesList = useMemo(() => sampleRepositories?.map((repository) => repository.name), []);

  const [exampleSearch, setexampleSearchExampleSearch] = useState<string>(example as string);

  useEffect(() => {
    if (sampleRepositoriesList && example) {
      setexampleSearchExampleSearch(searchStringInArray(searchText[0], sampleRepositoriesList) as string);
    }
  }, [searchText, sampleRepositoriesList, example]);

  if (isLoading) {
    return <List.EmptyView title={`Type query e.g "${exampleSearch ?? example}"`} />;
  }

  // If a search has been performed and returned no results, show a message.
  if (searchText.length > 0) {
    return <List.EmptyView title={`No templates found, try searching "${exampleSearch ?? example}"`} />;
  }

  // Unreachable, but required by TypeScript.
  return null;
}
