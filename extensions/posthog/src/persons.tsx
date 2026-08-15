import { LaunchProps, List } from "@raycast/api";
import { useUrl } from "../helpers/useUrl";
import { WithProjects } from "../helpers/ProjectsContext";
import { ResourceActions } from "../helpers/ResourceActions";
import { ProjectResourceList } from "../helpers/ProjectResourceList";

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
    <ProjectResourceList<Person> endpoint={`persons?search=${searchTerm}`} searchBarPlaceholder="Search persons...">
      {(persons) => persons.map((person) => <ResultsListSection key={person.id} person={person} />)}
    </ProjectResourceList>
  );
}

const ResultsListSection = ({ person }: { person: Person }) => {
  const originalId = person.distinct_ids[person.distinct_ids.length - 1];
  const appUrl = useUrl(`person/${originalId}`);

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
