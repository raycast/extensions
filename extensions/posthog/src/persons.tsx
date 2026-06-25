import { LaunchProps, List } from "@raycast/api";
import { buildAppUrl } from "../helpers/appUrl";
import { ProjectResourceList } from "../helpers/ProjectResourceList";
import { ResourceActions } from "../helpers/ResourceActions";
import { WithProjects, ProjectsContext } from "../helpers/ProjectsContext";
import { useContext } from "react";

type Person = {
  id: number;
  name: string;
  distinct_ids: string[];
};

export type PersonsArguments = {
  term: string;
};

function Persons({ searchTerm }: { searchTerm: string }) {
  return (
    <ProjectResourceList<Person>
      endpoint={`persons?search=${encodeURIComponent(searchTerm)}`}
      searchBarPlaceholder="Search persons..."
    >
      {(persons) => persons.map((person) => <ResultsListSection key={person.id} person={person} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ person }: { person: Person }) => {
  const { selectedAccount } = useContext(ProjectsContext);
  const originalId = person.distinct_ids[person.distinct_ids.length - 1];
  const appUrl = buildAppUrl(`person/${originalId}`, selectedAccount);

  return (
    <List.Item key={person.id} title={person.name} actions={<ResourceActions title={person.name} url={appUrl} />} />
  );
};

export default function Command(props: LaunchProps<{ arguments: PersonsArguments }>) {
  return (
    <WithProjects>
      <Persons searchTerm={props.arguments.term} />
    </WithProjects>
  );
}
