import { ProjectList } from "./components/project";

export default function MyStarredProjectsRoot(): JSX.Element {
  return <ProjectList starred={true} />;
}
